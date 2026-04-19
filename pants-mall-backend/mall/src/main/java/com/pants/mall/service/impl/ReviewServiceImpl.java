package com.pants.mall.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.pants.mall.common.BusinessException;
import com.pants.mall.dto.ReviewCreateReq;
import com.pants.mall.dto.ReviewItemResp;
import com.pants.mall.entity.OrderInfo;
import com.pants.mall.entity.Review;
import com.pants.mall.entity.User;
import com.pants.mall.mapper.OrderInfoMapper;
import com.pants.mall.mapper.ReviewMapper;
import com.pants.mall.mapper.UserMapper;
import com.pants.mall.service.ReviewService;
import com.pants.mall.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewServiceImpl implements ReviewService {

    private final ReviewMapper reviewMapper;
    private final OrderInfoMapper orderInfoMapper;
    private final UserMapper userMapper;
    private final SecurityUtil securityUtil;

    @Override
    public void createReview(ReviewCreateReq req) {
        Long currentUserId = securityUtil.currentUserId();
        if (currentUserId == null) {
            throw new BusinessException("未登录");
        }

        if (req == null) {
            throw new BusinessException("请求不能为空");
        }
        if (req.getOrderId() == null) {
            throw new BusinessException("orderId不能为空");
        }
        if (req.getSpuId() == null) {
            throw new BusinessException("spuId不能为空");
        }
        if (req.getSkuId() == null) {
            throw new BusinessException("skuId不能为空");
        }
        if (req.getRating() == null) {
            throw new BusinessException("评分不能为空");
        }
        if (req.getRating() < 1 || req.getRating() > 5) {
            throw new BusinessException("评分范围必须为1~5");
        }

        String content = req.getContent() == null ? "" : req.getContent().trim();
        if (content.length() > 512) {
            throw new BusinessException("评价内容不能超过512个字符");
        }

        String sizeFeel = normalizeSizeFeel(req.getSizeFeel());
        String lengthFeel = normalizeLengthFeel(req.getLengthFeel());
        String fitFeel = normalizeFitFeel(req.getFitFeel());
        String fabricFeel = normalizeFabricFeel(req.getFabricFeel());
        String purchaseSize = normalizePurchaseSize(req.getPurchaseSize());
        Integer anonymous = normalizeAnonymous(req.getAnonymous());
        String images = normalizeImages(req.getImages());

        OrderInfo orderInfo = orderInfoMapper.selectById(req.getOrderId());
        if (orderInfo == null || (orderInfo.getDeleted() != null && orderInfo.getDeleted() == 1)) {
            throw new BusinessException("订单不存在");
        }

        if (orderInfo.getUserId() == null || !orderInfo.getUserId().equals(currentUserId)) {
            throw new BusinessException("无权评价该订单");
        }

        String status = orderInfo.getStatus() == null ? "" : orderInfo.getStatus().trim();
        if (!"FINISHED".equalsIgnoreCase(status) && !"COMPLETED".equalsIgnoreCase(status)) {
            throw new BusinessException("只有已完成订单才能评价");
        }

        Long count = reviewMapper.selectCount(
                new LambdaQueryWrapper<Review>()
                        .eq(Review::getDeleted, 0)
                        .eq(Review::getUserId, currentUserId)
                        .eq(Review::getOrderId, req.getOrderId())
                        .eq(Review::getSpuId, req.getSpuId())
                        .eq(Review::getSkuId, req.getSkuId())
        );
        if (count != null && count > 0) {
            throw new BusinessException("该商品已评价，请勿重复提交");
        }

        Review review = new Review();
        review.setUserId(currentUserId);
        review.setOrderId(req.getOrderId());
        review.setSpuId(req.getSpuId());
        review.setSkuId(req.getSkuId());
        review.setRating(req.getRating());
        review.setContent(content);
        review.setSizeFeel(sizeFeel);
        review.setLengthFeel(lengthFeel);
        review.setFitFeel(fitFeel);
        review.setFabricFeel(fabricFeel);
        review.setPurchaseSize(purchaseSize);
        review.setAnonymous(anonymous);
        review.setImages(images);
        review.setDeleted(0);

        reviewMapper.insert(review);
    }

    @Override
    public List<ReviewItemResp> listBySpuId(Long spuId) {
        if (spuId == null) {
            throw new BusinessException("spuId不能为空");
        }

        List<Review> reviewList = reviewMapper.selectList(
                new LambdaQueryWrapper<Review>()
                        .eq(Review::getDeleted, 0)
                        .eq(Review::getSpuId, spuId)
                        .orderByDesc(Review::getCreatedAt)
        );

        List<ReviewItemResp> result = new ArrayList<>();
        for (Review review : reviewList) {
            ReviewItemResp item = new ReviewItemResp();
            item.setId(review.getId());
            item.setUserId(review.getUserId());
            item.setOrderId(review.getOrderId());
            item.setSpuId(review.getSpuId());
            item.setSkuId(review.getSkuId());
            item.setRating(review.getRating());
            item.setContent(review.getContent());
            item.setSizeFeel(review.getSizeFeel());
            item.setLengthFeel(review.getLengthFeel());
            item.setFitFeel(review.getFitFeel());
            item.setFabricFeel(review.getFabricFeel());
            item.setPurchaseSize(review.getPurchaseSize());
            item.setAnonymous(review.getAnonymous());
            item.setImages(splitImages(review.getImages()));
            item.setCreatedAt(review.getCreatedAt());

            if (review.getAnonymous() != null && review.getAnonymous() == 1) {
                item.setUsername("匿名用户");
            } else {
                User user = review.getUserId() == null ? null : userMapper.selectById(review.getUserId());
                if (user == null) {
                    item.setUsername("用户");
                } else {
                    String nickname = trimToNull(user.getNickname());
                    item.setUsername(nickname != null ? nickname : user.getUsername());
                }
            }

            result.add(item);
        }
        return result;
    }

    private String normalizeSizeFeel(String value) {
        String v = trimToNull(value);
        if (v == null) {
            return null;
        }
        if ("偏小".equals(v) || "合适".equals(v) || "偏大".equals(v)) {
            return v;
        }
        throw new BusinessException("尺码感受取值不合法");
    }

    private String normalizeLengthFeel(String value) {
        String v = trimToNull(value);
        if (v == null) {
            return null;
        }
        if ("偏短".equals(v) || "合适".equals(v) || "偏长".equals(v)) {
            return v;
        }
        throw new BusinessException("裤长感受取值不合法");
    }

    private String normalizeFitFeel(String value) {
        String v = trimToNull(value);
        if (v == null) {
            return null;
        }
        if ("修身".equals(v) || "合适".equals(v) || "宽松".equals(v)) {
            return v;
        }
        throw new BusinessException("版型感受取值不合法");
    }

    private String normalizeFabricFeel(String value) {
        String v = trimToNull(value);
        if (v == null) {
            return null;
        }
        if ("偏硬".equals(v) || "适中".equals(v) || "偏软".equals(v)) {
            return v;
        }
        throw new BusinessException("面料感受取值不合法");
    }

    private String normalizePurchaseSize(String value) {
        String v = trimToNull(value);
        if (v == null) {
            return null;
        }
        if (v.length() > 32) {
            throw new BusinessException("购买尺码不能超过32个字符");
        }
        return v;
    }

    private Integer normalizeAnonymous(Integer value) {
        if (value == null) {
            return 0;
        }
        if (value == 0 || value == 1) {
            return value;
        }
        throw new BusinessException("匿名评价取值不合法");
    }

    private String normalizeImages(List<String> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }

        List<String> normalized = values.stream()
                .map(this::trimToNull)
                .filter(v -> v != null && !v.isEmpty())
                .distinct()
                .collect(Collectors.toList());

        if (normalized.isEmpty()) {
            return null;
        }
        if (normalized.size() > 3) {
            throw new BusinessException("评价图片最多上传3张");
        }

        for (String item : normalized) {
            if (item.length() > 255) {
                throw new BusinessException("评价图片地址过长");
            }
            if (!item.startsWith("/uploads/")) {
                throw new BusinessException("评价图片地址不合法");
            }
        }

        return String.join(",", normalized);
    }

    private List<String> splitImages(String value) {
        String raw = trimToNull(value);
        if (raw == null) {
            return new ArrayList<>();
        }
        return Arrays.stream(raw.split(","))
                .map(this::trimToNull)
                .filter(v -> v != null && !v.isEmpty())
                .collect(Collectors.toList());
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String v = value.trim();
        return v.isEmpty() ? null : v;
    }
}