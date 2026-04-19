package com.pants.mall.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.pants.mall.common.BusinessException;
import com.pants.mall.common.Constants;
import com.pants.mall.dto.RecommendItemResp;
import com.pants.mall.entity.CartItem;
import com.pants.mall.entity.Favorite;
import com.pants.mall.entity.OrderInfo;
import com.pants.mall.entity.OrderItem;
import com.pants.mall.entity.ProductSku;
import com.pants.mall.entity.ProductSpu;
import com.pants.mall.entity.UserBodyProfile;
import com.pants.mall.mapper.CartItemMapper;
import com.pants.mall.mapper.FavoriteMapper;
import com.pants.mall.mapper.OrderInfoMapper;
import com.pants.mall.mapper.OrderItemMapper;
import com.pants.mall.mapper.ProductSkuMapper;
import com.pants.mall.mapper.ProductSpuMapper;
import com.pants.mall.mapper.UserBodyProfileMapper;
import com.pants.mall.service.RecommendService;
import com.pants.mall.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class RecommendServiceImpl implements RecommendService {

    private final SecurityUtil securityUtil;
    private final UserBodyProfileMapper profileMapper;
    private final ProductSkuMapper skuMapper;
    private final ProductSpuMapper spuMapper;
    private final FavoriteMapper favoriteMapper;
    private final CartItemMapper cartItemMapper;
    private final OrderInfoMapper orderInfoMapper;
    private final OrderItemMapper orderItemMapper;

    private static final int PRIMARY_MIN_MATCH_SCORE = 60;
    private static final int FALLBACK_MIN_MATCH_SCORE = 45;

    @Override
    public List<RecommendItemResp> recommendByProfile(Long profileId) {
        Long currentUserId = securityUtil.currentUserId();
        System.out.println("========== recommendByProfile start ==========");
        System.out.println("currentUserId = " + currentUserId);
        System.out.println("input profileId = " + profileId);

        if (currentUserId == null) {
            throw new BusinessException("未登录");
        }
        if (profileId == null) {
            throw new BusinessException("profileId不能为空");
        }

        // 管理端调试推荐时，允许按 profileId 直接读取档案
        UserBodyProfile profile = profileMapper.selectOne(
                new QueryWrapper<UserBodyProfile>()
                        .eq("id", profileId)
                        .eq("deleted", 0)
                        .last("limit 1")
        );

        System.out.println("profile found = " + (profile != null));
        if (profile != null) {
            System.out.println("profile.id = " + profile.getId());
            System.out.println("profile.userId = " + profile.getUserId());
            System.out.println("profile.name = " + profile.getName());
            System.out.println("profile.heightCm = " + profile.getHeightCm());
            System.out.println("profile.weightKg = " + profile.getWeightKg());
            System.out.println("profile.waistCm = " + profile.getWaistCm());
            System.out.println("profile.legLengthCm = " + profile.getLegLengthCm());
        }

        if (profile == null) {
            throw new BusinessException("档案不存在");
        }

        Integer waist = profile.getWaistCm();
        Integer leg = profile.getLegLengthCm();
        Integer height = profile.getHeightCm();
        Double weight = profile.getWeightKg();

        System.out.println("profile waist = " + waist + ", leg = " + leg + ", height = " + height + ", weight = " + weight);

        if (waist == null || leg == null) {
            throw new BusinessException("身材数据不完整，请先完善腰围和腿长");
        }

        List<ProductSku> skuList = skuMapper.selectList(
                new QueryWrapper<ProductSku>()
                        .eq("deleted", 0)
                        .eq("status", Constants.STATUS_ON)
                        .gt("stock", 0)
                        .isNotNull("spu_id")
                        .isNotNull("waist_cm")
                        .isNotNull("length_cm")
        );

        System.out.println("skuList size = " + (skuList == null ? 0 : skuList.size()));

        if (skuList == null || skuList.isEmpty()) {
            System.out.println("no available sku");
            System.out.println("========== recommendByProfile end ==========");
            return new ArrayList<>();
        }

        List<Long> spuIds = new ArrayList<>();
        for (ProductSku sku : skuList) {
            if (sku != null && sku.getSpuId() != null) {
                spuIds.add(sku.getSpuId());
            }
        }

        System.out.println("raw spuIds size = " + spuIds.size());

        if (spuIds.isEmpty()) {
            System.out.println("spuIds empty");
            System.out.println("========== recommendByProfile end ==========");
            return new ArrayList<>();
        }

        List<ProductSpu> spuList = spuMapper.selectBatchIds(spuIds);
        Map<Long, ProductSpu> spuMap = new HashMap<>();
        int spuDeletedFiltered = 0;
        int spuStatusFiltered = 0;

        if (spuList != null) {
            for (ProductSpu spu : spuList) {
                if (spu == null || spu.getId() == null) {
                    continue;
                }
                if (spu.getDeleted() != null && spu.getDeleted() == 1) {
                    spuDeletedFiltered++;
                    continue;
                }
                if (!Constants.STATUS_ON.equals(spu.getStatus())) {
                    spuStatusFiltered++;
                    continue;
                }
                spuMap.put(spu.getId(), spu);
            }
        }

        System.out.println("spuList fetched size = " + (spuList == null ? 0 : spuList.size()));
        System.out.println("spuMap size = " + spuMap.size());
        System.out.println("spuDeletedFiltered = " + spuDeletedFiltered);
        System.out.println("spuStatusFiltered = " + spuStatusFiltered);

        if (spuMap.isEmpty()) {
            System.out.println("spuMap empty after filter");
            System.out.println("========== recommendByProfile end ==========");
            return new ArrayList<>();
        }

        Long preferenceUserId = profile.getUserId();
        System.out.println("preferenceUserId = " + preferenceUserId);

        UserPreferenceProfile pref = buildUserPreferenceProfile(preferenceUserId, spuMap);

        List<ScoredRecommendItem> allScored = new ArrayList<>();
        int nullOrInvalidSkuCount = 0;
        int spuMissingCount = 0;
        int rejectCount = 0;
        int bodyScoreZeroCount = 0;
        int scoredCount = 0;

        for (ProductSku sku : skuList) {
            if (sku == null || sku.getId() == null || sku.getSpuId() == null) {
                nullOrInvalidSkuCount++;
                continue;
            }

            ProductSpu spu = spuMap.get(sku.getSpuId());
            if (spu == null) {
                spuMissingCount++;
                continue;
            }

            if (shouldReject(waist, leg, sku)) {
                rejectCount++;
                continue;
            }

            int waistDiff = Math.abs(sku.getWaistCm() - waist);
            int legDiff = Math.abs(sku.getLengthCm() - leg);

            double bodyScore = calculateBodyScore(waist, leg, height, weight, sku, spu);
            if (bodyScore <= 0) {
                bodyScoreZeroCount++;
                continue;
            }

            double behaviorScoreRaw = calculateBehaviorScore(pref, sku, spu);
            double behaviorScoreCapped = capBehaviorScore(bodyScore, waistDiff, legDiff, behaviorScoreRaw);
            double totalScore = bodyScore + behaviorScoreCapped;
            int matchScore = normalizeMatchScore(totalScore);
            String recommendType = resolveRecommendType(matchScore, waistDiff, legDiff, bodyScore);
            String reason = buildReason(waist, leg, height, weight, sku, spu, pref, behaviorScoreCapped);

            RecommendItemResp resp = new RecommendItemResp();
            resp.setSpuId(spu.getId());
            resp.setSkuId(sku.getId());
            resp.setName(spu.getName());
            resp.setPrice(sku.getPrice());
            resp.setCoverUrl(spu.getCoverUrl());
            resp.setStock(sku.getStock());
            resp.setFitType(sku.getFitType());
            resp.setLengthCm(sku.getLengthCm());
            resp.setWaistCm(sku.getWaistCm());
            resp.setReason(reason);
            resp.setMatchScore(matchScore);
            resp.setRecommendType(recommendType);

            allScored.add(new ScoredRecommendItem(resp, totalScore, sku, spu));
            scoredCount++;
        }

        System.out.println("nullOrInvalidSkuCount = " + nullOrInvalidSkuCount);
        System.out.println("spuMissingCount = " + spuMissingCount);
        System.out.println("rejectCount = " + rejectCount);
        System.out.println("bodyScoreZeroCount = " + bodyScoreZeroCount);
        System.out.println("scoredCount = " + scoredCount);
        System.out.println("allScored size = " + allScored.size());

        if (!allScored.isEmpty()) {
            List<ScoredRecommendItem> preview = new ArrayList<>(allScored);
            preview.sort(
                    Comparator.comparingDouble(ScoredRecommendItem::getScore)
                            .reversed()
                            .thenComparing(
                                    item -> item.getItem().getSpuId(),
                                    Comparator.nullsLast(Long::compareTo)
                            )
                            .thenComparing(
                                    item -> item.getItem().getSkuId(),
                                    Comparator.nullsLast(Long::compareTo)
                            )
            );

            System.out.println("---- top 10 raw scored preview ----");
            for (int i = 0; i < Math.min(10, preview.size()); i++) {
                ScoredRecommendItem item = preview.get(i);
                RecommendItemResp resp = item.getItem();
                System.out.println(
                        "rank=" + (i + 1)
                                + ", spuId=" + resp.getSpuId()
                                + ", skuId=" + resp.getSkuId()
                                + ", name=" + resp.getName()
                                + ", fitType=" + resp.getFitType()
                                + ", waistCm=" + resp.getWaistCm()
                                + ", lengthCm=" + resp.getLengthCm()
                                + ", matchScore=" + resp.getMatchScore()
                                + ", recommendType=" + resp.getRecommendType()
                                + ", totalScore=" + item.getScore()
                );
            }
        }

        if (allScored.isEmpty()) {
            System.out.println("allScored empty");
            System.out.println("========== recommendByProfile end ==========");
            return new ArrayList<>();
        }

        System.out.println("PRIMARY_MIN_MATCH_SCORE = " + PRIMARY_MIN_MATCH_SCORE);
        System.out.println("FALLBACK_MIN_MATCH_SCORE = " + FALLBACK_MIN_MATCH_SCORE);
        System.out.println("allScored before filter = " + allScored.size());

        List<ScoredRecommendItem> primaryList = filterAndRank(allScored, PRIMARY_MIN_MATCH_SCORE);
        System.out.println("primaryList size = " + primaryList.size());

        if (!primaryList.isEmpty()) {
            List<RecommendItemResp> result = toRespList(primaryList, 20);
            System.out.println("return primary result size = " + result.size());
            System.out.println("========== recommendByProfile end ==========");
            return result;
        }

        List<ScoredRecommendItem> fallbackList = filterAndRank(allScored, FALLBACK_MIN_MATCH_SCORE);
        System.out.println("fallbackList size = " + fallbackList.size());

        List<RecommendItemResp> result = toRespList(fallbackList, 20);
        System.out.println("return fallback result size = " + result.size());
        System.out.println("========== recommendByProfile end ==========");
        return result;
    }

    private List<ScoredRecommendItem> filterAndRank(List<ScoredRecommendItem> allScored, int minMatchScore) {
        List<ScoredRecommendItem> filtered = new ArrayList<>();
        for (ScoredRecommendItem item : allScored) {
            Integer score = item.getItem().getMatchScore();
            if (score != null && score >= minMatchScore) {
                filtered.add(item);
            }
        }

        System.out.println("filterAndRank minMatchScore = " + minMatchScore + ", filtered size = " + filtered.size());

        if (filtered.isEmpty()) {
            return new ArrayList<>();
        }

        Map<Long, ScoredRecommendItem> bestPerSpu = new HashMap<>();
        for (ScoredRecommendItem item : filtered) {
            Long spuId = item.getItem().getSpuId();
            ScoredRecommendItem old = bestPerSpu.get(spuId);
            if (old == null || item.getScore() > old.getScore()) {
                bestPerSpu.put(spuId, item);
            }
        }

        System.out.println("bestPerSpu size = " + bestPerSpu.size());

        List<ScoredRecommendItem> uniqueSpuList = new ArrayList<>(bestPerSpu.values());
        uniqueSpuList.sort(
                Comparator.comparingDouble(ScoredRecommendItem::getScore)
                        .reversed()
                        .thenComparing(
                                item -> item.getItem().getSpuId(),
                                Comparator.nullsLast(Long::compareTo)
                        )
                        .thenComparing(
                                item -> item.getItem().getSkuId(),
                                Comparator.nullsLast(Long::compareTo)
                        )
        );

        List<ScoredRecommendItem> diversified = diversifyTop(uniqueSpuList);
        System.out.println("diversified size = " + diversified.size());
        return diversified;
    }

    private List<RecommendItemResp> toRespList(List<ScoredRecommendItem> list, int limit) {
        List<RecommendItemResp> result = new ArrayList<>();
        int size = Math.min(list.size(), limit);
        for (int i = 0; i < size; i++) {
            result.add(list.get(i).getItem());
        }
        return result;
    }

    private boolean shouldReject(Integer waist, Integer leg, ProductSku sku) {
        if (sku.getWaistCm() == null || sku.getLengthCm() == null) {
            return true;
        }

        int waistDiff = Math.abs(sku.getWaistCm() - waist);
        int legDiff = Math.abs(sku.getLengthCm() - leg);

        if (waistDiff > 14) {
            return true;
        }
        return legDiff > 14;
    }

    private double calculateBodyScore(
            Integer waist,
            Integer leg,
            Integer height,
            Double weight,
            ProductSku sku,
            ProductSpu spu
    ) {
        double score = 100.0;
        int waistDiff = Math.abs(sku.getWaistCm() - waist);
        int legDiff = Math.abs(sku.getLengthCm() - leg);

        if (waistDiff == 0) {
            score += 16;
        } else if (waistDiff == 1) {
            score += 12;
        } else if (waistDiff == 2) {
            score += 8;
        } else if (waistDiff <= 4) {
            score += 2;
        } else if (waistDiff <= 6) {
            score -= waistDiff * 6.2;
        } else if (waistDiff <= 8) {
            score -= waistDiff * 7.2;
        } else {
            score -= waistDiff * 8.5;
        }

        if (legDiff == 0) {
            score += 14;
        } else if (legDiff == 1) {
            score += 11;
        } else if (legDiff == 2) {
            score += 7;
        } else if (legDiff <= 4) {
            score += 1;
        } else if (legDiff <= 6) {
            score -= legDiff * 7.5;
        } else if (legDiff <= 8) {
            score -= legDiff * 10.0;
        } else {
            score -= legDiff * 12.0;
        }

        String fitType = sku.getFitType();
        if (height != null && weight != null && height > 0) {
            double bmi = weight / Math.pow(height / 100.0, 2);

            if (bmi < 18.5) {
                if (fitType.contains("修身") || fitType.contains("锥形")) {
                    score += 8;
                } else if (fitType.contains("阔腿") || fitType.contains("休闲") || fitType.contains("宽松")) {
                    score -= 5;
                }
            } else if (bmi < 24) {
                if (fitType.contains("直筒") || fitType.contains("常规") || fitType.contains("修身")) {
                    score += 8;
                }
            } else {
                if (fitType.contains("休闲") || fitType.contains("宽松") || fitType.contains("阔腿") || fitType.contains("常规")) {
                    score += 10;
                } else if (fitType.contains("修身")) {
                    score -= 10;
                }
            }
        }

        if (fitType.contains("修身")) {
            score -= 2.0;
        }

        Integer sales = spu.getSales() == null ? 0 : spu.getSales();
        Integer stock = sku.getStock() == null ? 0 : sku.getStock();

        score += Math.min(sales, 300) * 0.012;
        score += Math.min(stock, 200) * 0.008;

        return score;
    }

    private double calculateBehaviorScore(UserPreferenceProfile pref, ProductSku sku, ProductSpu spu) {
        if (pref == null) {
            return 0;
        }

        double score = 0.0;
        Long spuId = spu.getId();
        Long skuId = sku.getId();

        if (spuId != null && pref.favoriteSpuIds.contains(spuId)) {
            score += 8.0;
        }
        if (spuId != null && pref.cartSpuIds.contains(spuId)) {
            score += 10.0;
        }
        if (spuId != null && pref.orderedSpuIds.contains(spuId)) {
            score += 12.0;
        }
        if (skuId != null && pref.cartSkuIds.contains(skuId)) {
            score += 9.0;
        }
        if (skuId != null && pref.orderedSkuIds.contains(skuId)) {
            score += 11.0;
        }

        String fitType = upper(sku.getFitType());
        String styleGroup = styleGroup(spu.getName(), fitType);

        score += Math.min(pref.fitTypeCounts.getOrDefault(fitType, 0) * 1.6, 7.0);
        score += Math.min(pref.styleGroupCounts.getOrDefault(styleGroup, 0) * 1.4, 6.0);

        int waistBucket = waistBucket(sku.getWaistCm());
        int lengthBucket = lengthPrefBucket(sku.getLengthCm());
        score += Math.min(pref.waistBucketCounts.getOrDefault(waistBucket, 0) * 1.2, 5.0);
        score += Math.min(pref.lengthBucketCounts.getOrDefault(lengthBucket, 0) * 1.2, 5.0);

        return score;
    }

    private double capBehaviorScore(double bodyScore, int waistDiff, int legDiff, double rawBehaviorScore) {
        if (rawBehaviorScore <= 0) {
            return 0;
        }

        if (waistDiff > 6 || legDiff > 6 || bodyScore < 78) {
            return Math.min(rawBehaviorScore, 2.0);
        }
        if (waistDiff > 4 || legDiff > 4 || bodyScore < 90) {
            return Math.min(rawBehaviorScore, 5.0);
        }
        if (bodyScore < 105) {
            return Math.min(rawBehaviorScore, 8.0);
        }
        return Math.min(rawBehaviorScore, 12.0);
    }

    private UserPreferenceProfile buildUserPreferenceProfile(Long userId, Map<Long, ProductSpu> spuMap) {
        UserPreferenceProfile pref = new UserPreferenceProfile();

        if (userId == null) {
            return pref;
        }

        List<Favorite> favorites = favoriteMapper.selectList(
                new QueryWrapper<Favorite>()
                        .eq("user_id", userId)
                        .eq("deleted", 0)
        );
        for (Favorite favorite : favorites) {
            if (favorite != null && favorite.getSpuId() != null) {
                pref.favoriteSpuIds.add(favorite.getSpuId());
                ProductSpu spu = spuMap.get(favorite.getSpuId());
                if (spu != null) {
                    String styleGroup = styleGroup(spu.getName(), "");
                    inc(pref.styleGroupCounts, styleGroup, 1);
                }
            }
        }

        List<CartItem> cartItems = cartItemMapper.selectList(
                new QueryWrapper<CartItem>()
                        .eq("user_id", userId)
                        .eq("deleted", 0)
        );
        List<Long> cartSkuIds = new ArrayList<>();
        for (CartItem item : cartItems) {
            if (item != null && item.getSkuId() != null) {
                pref.cartSkuIds.add(item.getSkuId());
                cartSkuIds.add(item.getSkuId());
            }
        }
        if (!cartSkuIds.isEmpty()) {
            List<ProductSku> cartSkus = skuMapper.selectBatchIds(cartSkuIds);
            for (ProductSku sku : cartSkus) {
                if (sku == null || sku.getId() == null) {
                    continue;
                }
                if (sku.getSpuId() != null) {
                    pref.cartSpuIds.add(sku.getSpuId());
                }
                absorbSkuPreference(pref, sku, spuMap, 2);
            }
        }

        List<OrderInfo> orderInfos = orderInfoMapper.selectList(
                new QueryWrapper<OrderInfo>()
                        .eq("user_id", userId)
                        .eq("deleted", 0)
                        .and(w -> w.isNotNull("paid_at")
                                .or().in("status", "PAID", "SHIPPED", "FINISHED", "COMPLETED"))
        );
        if (!orderInfos.isEmpty()) {
            List<Long> orderIds = new ArrayList<>();
            for (OrderInfo orderInfo : orderInfos) {
                if (orderInfo != null && orderInfo.getId() != null) {
                    orderIds.add(orderInfo.getId());
                }
            }

            if (!orderIds.isEmpty()) {
                List<OrderItem> orderItems = orderItemMapper.selectList(
                        new QueryWrapper<OrderItem>()
                                .in("order_id", orderIds)
                                .eq("deleted", 0)
                );

                List<Long> orderedSkuIds = new ArrayList<>();
                for (OrderItem item : orderItems) {
                    if (item == null) {
                        continue;
                    }
                    if (item.getSpuId() != null) {
                        pref.orderedSpuIds.add(item.getSpuId());
                    }
                    if (item.getSkuId() != null) {
                        pref.orderedSkuIds.add(item.getSkuId());
                        orderedSkuIds.add(item.getSkuId());
                    }
                }

                if (!orderedSkuIds.isEmpty()) {
                    List<ProductSku> orderedSkus = skuMapper.selectBatchIds(orderedSkuIds);
                    for (ProductSku sku : orderedSkus) {
                        if (sku == null || sku.getId() == null) {
                            continue;
                        }
                        absorbSkuPreference(pref, sku, spuMap, 3);
                    }
                }
            }
        }

        return pref;
    }

    private void absorbSkuPreference(
            UserPreferenceProfile pref,
            ProductSku sku,
            Map<Long, ProductSpu> spuMap,
            int weight
    ) {
        String fitType = upper(sku.getFitType());
        if (!fitType.isEmpty()) {
            inc(pref.fitTypeCounts, fitType, weight);
        }

        int waistBucket = waistBucket(sku.getWaistCm());
        int lengthBucket = lengthPrefBucket(sku.getLengthCm());
        inc(pref.waistBucketCounts, waistBucket, weight);
        inc(pref.lengthBucketCounts, lengthBucket, weight);

        ProductSpu spu = spuMap.get(sku.getSpuId());
        String styleGroup = styleGroup(spu == null ? "" : spu.getName(), fitType);
        inc(pref.styleGroupCounts, styleGroup, weight);
    }

    private void inc(Map<String, Integer> map, String key, int delta) {
        if (key == null || key.isEmpty()) {
            return;
        }
        map.put(key, map.getOrDefault(key, 0) + delta);
    }

    private void inc(Map<Integer, Integer> map, Integer key, int delta) {
        if (key == null || key < 0) {
            return;
        }
        map.put(key, map.getOrDefault(key, 0) + delta);
    }

    private int normalizeMatchScore(double rawScore) {
        double mapped = rawScore - 40;

        if (mapped >= 90) {
            mapped = 90 + (mapped - 90) * 0.25;
        } else if (mapped >= 75) {
            mapped = 75 + (mapped - 75) * 0.60;
        } else if (mapped >= 60) {
            mapped = 60 + (mapped - 60) * 0.80;
        }

        int score = (int) Math.round(mapped);
        if (score < 0) {
            return 0;
        }
        if (score > 100) {
            return 100;
        }
        return score;
    }

    private String resolveRecommendType(int matchScore, int waistDiff, int legDiff, double bodyScore) {
        if (matchScore >= 85 && waistDiff <= 2 && legDiff <= 2 && bodyScore >= 100) {
            return "BEST";
        }
        if (matchScore >= 60) {
            return "GOOD";
        }
        return "FALLBACK";
    }

    private String buildReason(
            Integer waist,
            Integer leg,
            Integer height,
            Double weight,
            ProductSku sku,
            ProductSpu spu,
            UserPreferenceProfile pref,
            double behaviorScore
    ) {
        List<String> reasons = new ArrayList<>();

        int waistDiff = Math.abs(sku.getWaistCm() - waist);
        int legDiff = Math.abs(sku.getLengthCm() - leg);

        if (waistDiff == 0) {
            reasons.add("腰围高度匹配");
        } else if (waistDiff <= 2) {
            reasons.add("腰围接近");
        } else if (waistDiff <= 4) {
            reasons.add("腰围较匹配");
        }

        if (legDiff == 0) {
            reasons.add("裤长高度匹配");
        } else if (legDiff <= 2) {
            reasons.add("裤长匹配");
        } else if (legDiff <= 4) {
            reasons.add("裤长较接近");
        }

        String fitType = upper(sku.getFitType());
        if (height != null && weight != null && height > 0) {
            double bmi = weight / Math.pow(height / 100.0, 2);

            if (bmi < 18.5 && (fitType.contains("SLIM") || fitType.contains("TAPER"))) {
                reasons.add("版型适合偏瘦体型");
            } else if (bmi >= 18.5 && bmi < 24 && (fitType.contains("STRAIGHT") || fitType.contains("REGULAR") || fitType.contains("SLIM"))) {
                reasons.add("版型适合标准体型");
            } else if (bmi >= 24 && (fitType.contains("LOOSE") || fitType.contains("RELAXED") || fitType.contains("WIDE") || fitType.contains("REGULAR"))) {
                reasons.add("版型更舒适");
            }
        }

        if (spu.getSales() != null && spu.getSales() >= 80) {
            reasons.add("销量较高");
        }
        if (sku.getStock() != null && sku.getStock() >= 20) {
            reasons.add("库存充足");
        }

        if (pref != null && behaviorScore >= 3.0) {
            if (spu.getId() != null && pref.favoriteSpuIds.contains(spu.getId())) {
                reasons.add("与你的收藏偏好一致");
            } else if (spu.getId() != null && pref.cartSpuIds.contains(spu.getId())) {
                reasons.add("与你的加购偏好一致");
            } else if (spu.getId() != null && pref.orderedSpuIds.contains(spu.getId())) {
                reasons.add("与你的购买偏好一致");
            } else {
                String styleGroup = styleGroup(spu.getName(), fitType);
                if (pref.styleGroupCounts.getOrDefault(styleGroup, 0) >= 2) {
                    reasons.add("版型接近你的历史偏好");
                } else if (pref.fitTypeCounts.getOrDefault(fitType, 0) >= 2 && !fitType.isEmpty()) {
                    reasons.add("版型接近你的历史偏好");
                }
            }
        }

        if (reasons.isEmpty()) {
            reasons.add("综合匹配较好");
        }

        if (reasons.size() > 4) {
            reasons = reasons.subList(0, 4);
        }

        return String.join("，", reasons);
    }

    private List<ScoredRecommendItem> diversifyTop(List<ScoredRecommendItem> sortedList) {
        List<ScoredRecommendItem> result = new ArrayList<>();
        List<ScoredRecommendItem> remain = new ArrayList<>(sortedList);

        while (!remain.isEmpty() && result.size() < 20) {
            ScoredRecommendItem picked = null;

            for (ScoredRecommendItem candidate : remain) {
                if (canPlace(result, candidate)) {
                    picked = candidate;
                    break;
                }
            }

            if (picked == null) {
                for (ScoredRecommendItem candidate : remain) {
                    if (canPlaceLoosely(result, candidate)) {
                        picked = candidate;
                        break;
                    }
                }
            }

            if (picked == null) {
                picked = remain.get(0);
            }

            result.add(picked);
            remain.remove(picked);
        }

        return result;
    }

    private boolean canPlace(List<ScoredRecommendItem> result, ScoredRecommendItem candidate) {
        if (result.isEmpty()) {
            return true;
        }

        String curFit = upper(candidate.getItem().getFitType());
        int curLengthBucket = lengthBucket(candidate.getItem().getLengthCm());
        String curStyleGroup = styleGroup(candidate.getItem().getName(), curFit);

        ScoredRecommendItem last = result.get(result.size() - 1);
        String lastFit = upper(last.getItem().getFitType());
        int lastLengthBucket = lengthBucket(last.getItem().getLengthCm());

        if (lastFit.equals(curFit) && lastLengthBucket == curLengthBucket) {
            return false;
        }

        int recentStyleSameCount = 0;
        int recentCheck = Math.min(3, result.size());
        for (int i = result.size() - recentCheck; i < result.size(); i++) {
            String g = styleGroup(
                    result.get(i).getItem().getName(),
                    upper(result.get(i).getItem().getFitType())
            );
            if (g.equals(curStyleGroup)) {
                recentStyleSameCount++;
            }
        }
        if (recentStyleSameCount >= 2) {
            return false;
        }

        int recentSlimCount = 0;
        int slimCheck = Math.min(2, result.size());
        for (int i = result.size() - slimCheck; i < result.size(); i++) {
            String fit = upper(result.get(i).getItem().getFitType());
            if (fit.contains("SLIM")) {
                recentSlimCount++;
            }
        }

        return !(curFit.contains("SLIM") && recentSlimCount >= 2);
    }

    private boolean canPlaceLoosely(List<ScoredRecommendItem> result, ScoredRecommendItem candidate) {
        if (result.isEmpty()) {
            return true;
        }

        ScoredRecommendItem last = result.get(result.size() - 1);
        String lastFit = upper(last.getItem().getFitType());
        String curFit = upper(candidate.getItem().getFitType());
        int lastLengthBucket = lengthBucket(last.getItem().getLengthCm());
        int curLengthBucket = lengthBucket(candidate.getItem().getLengthCm());

        return !(lastFit.equals(curFit) && lastLengthBucket == curLengthBucket);
    }

    private String upper(String s) {
        return s == null ? "" : s.toUpperCase(Locale.ROOT);
    }

    private int lengthBucket(Integer length) {
        if (length == null) {
            return -1;
        }
        if (length <= 88) {
            return 1;
        }
        if (length <= 92) {
            return 2;
        }
        if (length <= 96) {
            return 3;
        }
        if (length <= 100) {
            return 4;
        }
        if (length <= 104) {
            return 5;
        }
        if (length <= 110) {
            return 6;
        }
        return 7;
    }

    private int waistBucket(Integer waist) {
        if (waist == null) {
            return -1;
        }
        return waist / 4;
    }

    private int lengthPrefBucket(Integer length) {
        if (length == null) {
            return -1;
        }
        return length / 4;
    }

    private String styleGroup(String name, String fitType) {
        String n = name == null ? "" : name;
        String fit = fitType == null ? "" : fitType;

        if (n.contains("九分")) {
            return "NINE_" + fit;
        }
        if (n.contains("工装")) {
            return "CARGO_" + fit;
        }
        if (n.contains("加长") || n.contains("长裤")) {
            return "LONG_" + fit;
        }
        if (n.contains("宽松")) {
            return "LOOSE_" + fit;
        }
        if (n.contains("直筒")) {
            return "STRAIGHT_NAME_" + fit;
        }
        if (n.contains("修身")) {
            return "SLIM_NAME_" + fit;
        }
        if (n.contains("牛仔")) {
            return "JEANS_" + fit;
        }

        return "OTHER_" + fit;
    }

    private static class ScoredRecommendItem {
        private final RecommendItemResp item;
        private final double score;
        private final ProductSku sku;
        private final ProductSpu spu;

        public ScoredRecommendItem(RecommendItemResp item, double score, ProductSku sku, ProductSpu spu) {
            this.item = item;
            this.score = score;
            this.sku = sku;
            this.spu = spu;
        }

        public RecommendItemResp getItem() {
            return item;
        }

        public double getScore() {
            return score;
        }
    }

    private static class UserPreferenceProfile {
        private final Set<Long> favoriteSpuIds = new HashSet<>();
        private final Set<Long> cartSpuIds = new HashSet<>();
        private final Set<Long> cartSkuIds = new HashSet<>();
        private final Set<Long> orderedSpuIds = new HashSet<>();
        private final Set<Long> orderedSkuIds = new HashSet<>();

        private final Map<String, Integer> fitTypeCounts = new HashMap<>();
        private final Map<String, Integer> styleGroupCounts = new HashMap<>();
        private final Map<Integer, Integer> waistBucketCounts = new HashMap<>();
        private final Map<Integer, Integer> lengthBucketCounts = new HashMap<>();
    }
}