package com.pants.mall.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.pants.mall.common.BusinessException;
import com.pants.mall.common.Constants;
import com.pants.mall.dto.AdminSpuDetailResp;
import com.pants.mall.dto.ProductCompareResp;
import com.pants.mall.dto.ProductItemResp;
import com.pants.mall.dto.ProductListResp;
import com.pants.mall.dto.ProductQueryReq;
import com.pants.mall.dto.SkuSaveReq;
import com.pants.mall.dto.SpuSaveReq;
import com.pants.mall.entity.ProductSku;
import com.pants.mall.entity.ProductSpu;
import com.pants.mall.mapper.ProductSkuMapper;
import com.pants.mall.mapper.ProductSpuMapper;
import com.pants.mall.mapper.ReviewMapper;
import com.pants.mall.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductSpuMapper productSpuMapper;
    private final ProductSkuMapper productSkuMapper;
    private final ReviewMapper reviewMapper;

    @Override
    public ProductListResp query(ProductQueryReq req) {
        String sortBy = req.getSortBy();
        String sortOrder = req.getSortOrder();

        List<String> resolvedColors = resolveColors(req);
        if (resolvedColors != null && !resolvedColors.isEmpty()) {
            req.setColorValues(resolvedColors);
        } else {
            req.setColorValues(null);
        }

        if ("PRICE".equalsIgnoreCase(sortBy)) {
            return queryByPrice(req, sortOrder);
        }

        List<Long> skuFilteredSpuIds = null;

        boolean hasSkuFilter =
                (resolvedColors != null && !resolvedColors.isEmpty())
                        || StringUtils.hasText(req.getColor())
                        || StringUtils.hasText(req.getSize())
                        || StringUtils.hasText(req.getFitType())
                        || req.getMinPrice() != null
                        || req.getMaxPrice() != null
                        || Boolean.TRUE.equals(req.getOnlyInStock())
                        || req.getLengthMin() != null
                        || req.getLengthMax() != null
                        || req.getWaistMin() != null
                        || req.getWaistMax() != null
                        || req.getLegOpeningMin() != null
                        || req.getLegOpeningMax() != null;

        if (hasSkuFilter) {
            QueryWrapper<ProductSku> skuQ = new QueryWrapper<>();

            skuQ.select("spu_id")
                    .eq("deleted", 0)
                    .eq("status", Constants.STATUS_ON);

            if (resolvedColors != null && !resolvedColors.isEmpty()) {
                skuQ.in("color", resolvedColors);
            } else if (StringUtils.hasText(req.getColor())) {
                skuQ.eq("color", req.getColor());
            }

            if (StringUtils.hasText(req.getSize())) {
                skuQ.eq("size", req.getSize());
            }

            if (StringUtils.hasText(req.getFitType())) {
                skuQ.eq("fit_type", req.getFitType());
            }

            if (req.getMinPrice() != null) {
                skuQ.ge("price", req.getMinPrice());
            }

            if (req.getMaxPrice() != null) {
                skuQ.le("price", req.getMaxPrice());
            }

            if (Boolean.TRUE.equals(req.getOnlyInStock())) {
                skuQ.gt("stock", 0);
            }

            if (req.getLengthMin() != null) {
                skuQ.ge("length_cm", req.getLengthMin());
            }

            if (req.getLengthMax() != null) {
                skuQ.le("length_cm", req.getLengthMax());
            }

            if (req.getWaistMin() != null) {
                skuQ.ge("waist_cm", req.getWaistMin());
            }

            if (req.getWaistMax() != null) {
                skuQ.le("waist_cm", req.getWaistMax());
            }

            if (req.getLegOpeningMin() != null) {
                skuQ.ge("leg_opening_cm", req.getLegOpeningMin());
            }

            if (req.getLegOpeningMax() != null) {
                skuQ.le("leg_opening_cm", req.getLegOpeningMax());
            }

            skuQ.groupBy("spu_id");

            List<Object> objs = productSkuMapper.selectObjs(skuQ);
            skuFilteredSpuIds = objs.stream().map(o -> ((Number) o).longValue()).toList();

            if (skuFilteredSpuIds.isEmpty()) {
                return new ProductListResp(0, List.of());
            }
        }

        QueryWrapper<ProductSpu> qw = new QueryWrapper<>();
        qw.eq("deleted", 0).eq("status", Constants.STATUS_ON);

        if (StringUtils.hasText(req.getKeyword())) {
            qw.like("name", req.getKeyword());
        }

        if (req.getCategoryId() != null) {
            qw.eq("category_id", req.getCategoryId());
        }

        if (skuFilteredSpuIds != null) {
            qw.in("id", skuFilteredSpuIds);
        }

        if ("SALES".equalsIgnoreCase(sortBy)) {
            qw.orderBy(true, !"DESC".equalsIgnoreCase(sortOrder), "sales");
        } else if ("NEW".equalsIgnoreCase(sortBy)) {
            qw.orderBy(true, !"DESC".equalsIgnoreCase(sortOrder), "created_at");
        } else {
            qw.orderByDesc("created_at");
        }

        long pageNo = req.getPageNo() == null ? 1 : req.getPageNo();
        long pageSize = req.getPageSize() == null ? 10 : req.getPageSize();

        Page<ProductSpu> page = new Page<>(pageNo, pageSize);
        Page<ProductSpu> result = productSpuMapper.selectPage(page, qw);

        List<Long> spuIds = result.getRecords().stream().map(ProductSpu::getId).toList();
        Map<Long, ProductItemResp> aggMap = aggregateSkuInfo(spuIds);

        List<ProductItemResp> list =
                result.getRecords().stream()
                        .map(spu -> {
                            ProductItemResp resp =
                                    aggMap.getOrDefault(spu.getId(), new ProductItemResp());

                            resp.setId(spu.getId());
                            resp.setName(spu.getName());
                            resp.setCategoryId(spu.getCategoryId());
                            resp.setDescription(spu.getDescription());
                            resp.setStatus(spu.getStatus());
                            resp.setSales(spu.getSales());
                            resp.setCoverUrl(spu.getCoverUrl());

                            return resp;
                        })
                        .toList();

        return new ProductListResp(result.getTotal(), list);
    }

    @Override
    public ProductListResp adminQuery(ProductQueryReq req) {
        QueryWrapper<ProductSpu> qw = new QueryWrapper<>();
        qw.eq("deleted", 0);

        if (StringUtils.hasText(req.getKeyword())) {
            qw.like("name", req.getKeyword());
        }

        if (req.getCategoryId() != null) {
            qw.eq("category_id", req.getCategoryId());
        }

        if (StringUtils.hasText(req.getStatus())) {
            qw.eq("status", req.getStatus());
        }

        String sortBy = req.getSortBy();
        String sortOrder = req.getSortOrder();
        boolean asc = "ASC".equalsIgnoreCase(sortOrder);

        if ("SALES".equalsIgnoreCase(sortBy)) {
            qw.orderBy(true, asc, "sales");
        } else if ("NAME".equalsIgnoreCase(sortBy)) {
            qw.orderBy(true, asc, "name");
        } else if ("STATUS".equalsIgnoreCase(sortBy)) {
            qw.orderBy(true, asc, "status");
        } else {
            qw.orderByDesc("created_at");
        }

        long pageNo = req.getPageNo() == null ? 1 : req.getPageNo();
        long pageSize = req.getPageSize() == null ? 10 : req.getPageSize();

        Page<ProductSpu> page = new Page<>(pageNo, pageSize);
        Page<ProductSpu> result = productSpuMapper.selectPage(page, qw);

        List<Long> spuIds = result.getRecords().stream().map(ProductSpu::getId).toList();
        Map<Long, ProductItemResp> aggMap = aggregateSkuInfo(spuIds);

        List<ProductItemResp> list =
                result.getRecords().stream()
                        .map(spu -> {
                            ProductItemResp resp =
                                    aggMap.getOrDefault(spu.getId(), new ProductItemResp());

                            resp.setId(spu.getId());
                            resp.setName(spu.getName());
                            resp.setCategoryId(spu.getCategoryId());
                            resp.setDescription(spu.getDescription());
                            resp.setStatus(spu.getStatus());
                            resp.setSales(spu.getSales());
                            resp.setCoverUrl(spu.getCoverUrl());

                            return resp;
                        })
                        .toList();

        return new ProductListResp(result.getTotal(), list);
    }

    @Override
    public List<ProductCompareResp> compareBySpuIds(List<Long> spuIds) {
        if (spuIds == null || spuIds.isEmpty()) {
            return List.of();
        }

        List<Long> validIds = spuIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .limit(3)
                .toList();

        if (validIds.isEmpty()) {
            return List.of();
        }

        List<ProductSpu> spus = productSpuMapper.selectBatchIds(validIds);
        if (spus == null || spus.isEmpty()) {
            return List.of();
        }

        Map<Long, ProductSpu> spuMap = spus.stream()
                .filter(spu ->
                        (spu.getDeleted() == null || spu.getDeleted() == 0)
                                && Constants.STATUS_ON.equalsIgnoreCase(spu.getStatus())
                )
                .collect(Collectors.toMap(ProductSpu::getId, s -> s));

        if (spuMap.isEmpty()) {
            return List.of();
        }

        List<Long> realIds = validIds.stream()
                .filter(spuMap::containsKey)
                .toList();

        List<Map<String, Object>> skuAggRows = productSkuMapper.selectCompareAggBySpuIds(realIds);
        Map<Long, Map<String, Object>> skuAggMap = new HashMap<>();
        for (Map<String, Object> row : skuAggRows) {
            Long spuId = ((Number) row.get("spu_id")).longValue();
            skuAggMap.put(spuId, row);
        }

        List<Map<String, Object>> reviewAggRows = reviewMapper.selectReviewAggBySpuIds(realIds);
        Map<Long, Map<String, Object>> reviewAggMap = new HashMap<>();
        for (Map<String, Object> row : reviewAggRows) {
            Long spuId = ((Number) row.get("spu_id")).longValue();
            reviewAggMap.put(spuId, row);
        }

        List<ProductCompareResp> result = new ArrayList<>();

        for (Long id : realIds) {
            ProductSpu spu = spuMap.get(id);
            if (spu == null) {
                continue;
            }

            Map<String, Object> skuAgg = skuAggMap.get(id);
            Map<String, Object> reviewAgg = reviewAggMap.get(id);

            ProductCompareResp resp = new ProductCompareResp();
            resp.setId(spu.getId());
            resp.setCategoryId(spu.getCategoryId());
            resp.setName(spu.getName());
            resp.setDescription(spu.getDescription());
            resp.setCoverUrl(spu.getCoverUrl());
            resp.setSales(spu.getSales());

            if (skuAgg != null) {
                BigDecimal minPrice = (BigDecimal) skuAgg.get("min_price");
                BigDecimal maxPrice = (BigDecimal) skuAgg.get("max_price");
                Integer totalStock = skuAgg.get("total_stock") == null
                        ? 0
                        : ((Number) skuAgg.get("total_stock")).intValue();

                resp.setMinPrice(minPrice);
                resp.setMaxPrice(maxPrice);
                resp.setTotalStock(totalStock);
                resp.setInStock(totalStock > 0);

                resp.setMinWaistCm(skuAgg.get("min_waist_cm") == null ? null : ((Number) skuAgg.get("min_waist_cm")).intValue());
                resp.setMaxWaistCm(skuAgg.get("max_waist_cm") == null ? null : ((Number) skuAgg.get("max_waist_cm")).intValue());
                resp.setMinLengthCm(skuAgg.get("min_length_cm") == null ? null : ((Number) skuAgg.get("min_length_cm")).intValue());
                resp.setMaxLengthCm(skuAgg.get("max_length_cm") == null ? null : ((Number) skuAgg.get("max_length_cm")).intValue());
                resp.setMinLegOpeningCm(skuAgg.get("min_leg_opening_cm") == null ? null : ((Number) skuAgg.get("min_leg_opening_cm")).intValue());
                resp.setMaxLegOpeningCm(skuAgg.get("max_leg_opening_cm") == null ? null : ((Number) skuAgg.get("max_leg_opening_cm")).intValue());

                resp.setColors(splitToList((String) skuAgg.get("colors")));
                resp.setSizes(splitToList((String) skuAgg.get("sizes")));
                resp.setFitTypes(splitToList((String) skuAgg.get("fit_types")));
            } else {
                resp.setTotalStock(0);
                resp.setInStock(false);
                resp.setColors(List.of());
                resp.setSizes(List.of());
                resp.setFitTypes(List.of());
            }

            if (reviewAgg != null) {
                BigDecimal avgRating = reviewAgg.get("avg_rating") == null
                        ? BigDecimal.ZERO
                        : new BigDecimal(String.valueOf(reviewAgg.get("avg_rating")));
                Integer reviewCount = reviewAgg.get("review_count") == null
                        ? 0
                        : ((Number) reviewAgg.get("review_count")).intValue();
                Integer goodReviewCount = reviewAgg.get("good_review_count") == null
                        ? 0
                        : ((Number) reviewAgg.get("good_review_count")).intValue();

                resp.setAvgRating(avgRating);
                resp.setReviewCount(reviewCount);
                resp.setGoodReviewCount(goodReviewCount);

                if (reviewCount > 0) {
                    BigDecimal rate = BigDecimal.valueOf(goodReviewCount)
                            .multiply(BigDecimal.valueOf(100))
                            .divide(BigDecimal.valueOf(reviewCount), 2, RoundingMode.HALF_UP);
                    resp.setGoodReviewRate(rate);
                } else {
                    resp.setGoodReviewRate(BigDecimal.ZERO);
                }
            } else {
                resp.setAvgRating(BigDecimal.ZERO);
                resp.setReviewCount(0);
                resp.setGoodReviewCount(0);
                resp.setGoodReviewRate(BigDecimal.ZERO);
            }

            result.add(resp);
        }

        return result;
    }

    private ProductListResp queryByPrice(ProductQueryReq req, String sortOrder) {
        List<Map<String, Object>> rows = productSkuMapper.selectSpuMinPrice(req);

        if (rows.isEmpty()) {
            return new ProductListResp(0, List.of());
        }

        List<Long> orderedSpuIds =
                rows.stream()
                        .map(r -> ((Number) r.get("spu_id")).longValue())
                        .toList();

        int pageNo = req.getPageNo() == null ? 1 : req.getPageNo();
        int pageSize = req.getPageSize() == null ? 10 : req.getPageSize();

        int from = Math.max(0, (pageNo - 1) * pageSize);
        int to = Math.min(orderedSpuIds.size(), from + pageSize);

        if (from >= to) {
            return new ProductListResp(orderedSpuIds.size(), List.of());
        }

        List<Long> pageIds = orderedSpuIds.subList(from, to);
        List<ProductSpu> spus = productSpuMapper.selectBatchIds(pageIds);

        Map<Long, ProductSpu> spuMap =
                spus.stream().collect(Collectors.toMap(ProductSpu::getId, s -> s));

        Map<Long, ProductItemResp> aggMap = aggregateSkuInfo(pageIds);

        List<ProductItemResp> list =
                pageIds.stream()
                        .map(id -> {
                            ProductSpu spu = spuMap.get(id);
                            if (spu == null) {
                                return null;
                            }

                            ProductItemResp resp =
                                    aggMap.getOrDefault(id, new ProductItemResp());

                            resp.setId(spu.getId());
                            resp.setName(spu.getName());
                            resp.setCategoryId(spu.getCategoryId());
                            resp.setDescription(spu.getDescription());
                            resp.setStatus(spu.getStatus());
                            resp.setSales(spu.getSales());
                            resp.setCoverUrl(spu.getCoverUrl());

                            return resp;
                        })
                        .filter(Objects::nonNull)
                        .toList();

        return new ProductListResp(orderedSpuIds.size(), list);
    }

    private List<String> resolveColors(ProductQueryReq req) {
        if (StringUtils.hasText(req.getColorFamily())) {
            return switch (req.getColorFamily()) {
                case "黑色系" -> List.of("黑", "黑色");
                case "灰色系" -> List.of("灰", "灰色");
                case "白色系" -> List.of("白", "米白");
                case "蓝色系" -> List.of("蓝", "蓝色", "浅蓝", "深蓝", "复古蓝", "藏青");
                case "绿色系" -> List.of("军绿");
                case "卡其色系" -> List.of("卡其");
                case "棕色系" -> List.of("棕", "棕色");
                default -> Collections.emptyList();
            };
        }

        if (StringUtils.hasText(req.getColor())) {
            return List.of(req.getColor());
        }

        return Collections.emptyList();
    }

    private Map<Long, ProductItemResp> aggregateSkuInfo(List<Long> spuIds) {
        if (spuIds == null || spuIds.isEmpty()) {
            return Collections.emptyMap();
        }

        List<Map<String, Object>> aggs = productSkuMapper.selectAggBySpuIds(spuIds);

        Map<Long, ProductItemResp> map = new HashMap<>();

        for (Map<String, Object> row : aggs) {
            Long spuId = ((Number) row.get("spu_id")).longValue();
            BigDecimal minPrice = (BigDecimal) row.get("min_price");
            BigDecimal maxPrice = (BigDecimal) row.get("max_price");
            Integer totalStock = ((Number) row.get("total_stock")).intValue();

            ProductItemResp resp = new ProductItemResp();
            resp.setMinPrice(minPrice);
            resp.setMaxPrice(maxPrice);
            resp.setTotalStock(totalStock);

            map.put(spuId, resp);
        }

        return map;
    }

    private List<String> splitToList(String raw) {
        if (!StringUtils.hasText(raw)) {
            return List.of();
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .distinct()
                .toList();
    }

    @Override
    public ProductSpu getById(Long id) {
        return productSpuMapper.selectById(id);
    }

    @Override
    public AdminSpuDetailResp getAdminDetailById(Long id) {
        ProductSpu spu = productSpuMapper.selectById(id);
        if (spu == null || (spu.getDeleted() != null && spu.getDeleted() == 1)) {
            throw new BusinessException("商品不存在");
        }

        List<ProductSku> skuEntities = productSkuMapper.selectAdminSkusBySpuId(id);

        List<SkuSaveReq> skus =
                skuEntities.stream().map(sku -> {
                    SkuSaveReq item = new SkuSaveReq();
                    item.setSkuCode(sku.getSkuCode());
                    item.setTitle(sku.getTitle());
                    item.setPrice(sku.getPrice());
                    item.setStock(sku.getStock());
                    item.setColor(sku.getColor());
                    item.setSize(sku.getSize());
                    item.setStatus(sku.getStatus());
                    item.setLengthCm(sku.getLengthCm());
                    item.setWaistCm(sku.getWaistCm());
                    item.setLegOpeningCm(sku.getLegOpeningCm());
                    item.setFitType(sku.getFitType());
                    return item;
                }).toList();

        AdminSpuDetailResp resp = new AdminSpuDetailResp();
        resp.setId(spu.getId());
        resp.setName(spu.getName());
        resp.setCategoryId(spu.getCategoryId());
        resp.setDescription(spu.getDescription());
        resp.setStatus(spu.getStatus());
        resp.setCoverUrl(spu.getCoverUrl());
        resp.setSkus(skus);

        return resp;
    }

    @Override
    @Transactional
    public Long createSpu(SpuSaveReq req) {
        checkSkuCodeDuplicate(req, null);

        ProductSpu spu = new ProductSpu();
        spu.setName(req.getName());
        spu.setCategoryId(req.getCategoryId());
        spu.setDescription(req.getDescription());
        spu.setStatus(req.getStatus());
        spu.setCoverUrl(req.getCoverUrl());
        spu.setSales(0);

        productSpuMapper.insert(spu);
        batchInsertSkus(spu.getId(), req);

        return spu.getId();
    }

    @Override
    @Transactional
    public void updateSpu(Long id, SpuSaveReq req) {
        ProductSpu old = productSpuMapper.selectById(id);
        if (old == null || (old.getDeleted() != null && old.getDeleted() == 1)) {
            throw new BusinessException("商品不存在");
        }

        checkSkuCodeDuplicate(req, id);

        ProductSpu spu = new ProductSpu();
        spu.setId(id);
        spu.setName(req.getName());
        spu.setCategoryId(req.getCategoryId());
        spu.setDescription(req.getDescription());
        spu.setStatus(req.getStatus());
        spu.setCoverUrl(req.getCoverUrl());

        productSpuMapper.updateById(spu);

        productSkuMapper.hardDeleteBySpuId(id);

        batchInsertSkus(id, req);
    }

    @Override
    @Transactional
    public void deleteSpu(Long id) {
        ProductSpu old = productSpuMapper.selectById(id);

        if (old == null || (old.getDeleted() != null && old.getDeleted() == 1)) {
            throw new BusinessException("商品不存在");
        }

        productSpuMapper.update(
                null,
                new UpdateWrapper<ProductSpu>()
                        .eq("id", id)
                        .eq("deleted", 0)
                        .set("deleted", 1)
        );

        productSkuMapper.update(
                null,
                new UpdateWrapper<ProductSku>()
                        .eq("spu_id", id)
                        .eq("deleted", 0)
                        .set("deleted", 1)
        );
    }

    private void checkSkuCodeDuplicate(SpuSaveReq req, Long currentSpuId) {
        if (req.getSkus() == null || req.getSkus().isEmpty()) {
            throw new BusinessException("SKU 不能为空");
        }

        Set<String> set = new HashSet<>();

        for (SkuSaveReq sku : req.getSkus()) {
            if (!StringUtils.hasText(sku.getSkuCode())) {
                throw new BusinessException("skuCode 不能为空");
            }
            if (!set.add(sku.getSkuCode())) {
                throw new BusinessException("skuCode 重复");
            }
        }

        List<ProductSku> exists = productSkuMapper.selectList(
                new QueryWrapper<ProductSku>()
                        .in("sku_code", set)
                        .eq("deleted", 0)
        );

        if (exists == null || exists.isEmpty()) {
            return;
        }

        for (ProductSku sku : exists) {
            if (currentSpuId == null || !Objects.equals(sku.getSpuId(), currentSpuId)) {
                throw new BusinessException("skuCode 已存在");
            }
        }
    }

    private void batchInsertSkus(Long spuId, SpuSaveReq req) {
        for (SkuSaveReq s : req.getSkus()) {
            ProductSku sku = new ProductSku();

            sku.setSpuId(spuId);
            sku.setSkuCode(s.getSkuCode());
            sku.setTitle(s.getTitle());
            sku.setPrice(s.getPrice());
            sku.setStock(s.getStock());
            sku.setColor(s.getColor());
            sku.setSize(s.getSize());
            sku.setStatus(s.getStatus());
            sku.setLengthCm(s.getLengthCm());
            sku.setWaistCm(s.getWaistCm());
            sku.setLegOpeningCm(s.getLegOpeningCm());
            sku.setFitType(s.getFitType());

            productSkuMapper.insert(sku);
        }
    }

    @Override
    @Transactional
    public void updateStatus(Long id, String status) {
        ProductSpu spu = productSpuMapper.selectById(id);

        if (spu == null || (spu.getDeleted() != null && spu.getDeleted() == 1)) {
            throw new BusinessException("商品不存在");
        }

        productSpuMapper.update(
                null,
                new UpdateWrapper<ProductSpu>()
                        .eq("id", id)
                        .set("status", status)
        );
    }
}