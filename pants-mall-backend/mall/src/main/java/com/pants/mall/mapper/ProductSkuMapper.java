package com.pants.mall.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pants.mall.dto.ProductQueryReq;
import com.pants.mall.entity.ProductSku;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Mapper
public interface ProductSkuMapper extends BaseMapper<ProductSku> {

    List<Map<String, Object>> selectAggBySpuIds(@Param("spuIds") List<Long> spuIds);

    List<Map<String, Object>> selectSpuMinPrice(@Param("req") ProductQueryReq req);

    List<Map<String, Object>> selectCompareAggBySpuIds(@Param("spuIds") List<Long> spuIds);

    List<ProductSku> selectOptionsBySpuId(@Param("spuId") Long spuId);

    Map<String, String> selectOptionValuesBySpuId(@Param("spuId") Long spuId);

    List<ProductSku> searchPants(
            @Param("spuId") Long spuId,
            @Param("color") String color,
            @Param("size") String size,
            @Param("lengthCm") Integer lengthCm,
            @Param("waistCm") Integer waistCm,
            @Param("legOpeningCm") Integer legOpeningCm,
            @Param("fitType") String fitType,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice
    );

    List<ProductSku> searchByLength(@Param("lengthCm") Integer lengthCm);

    List<ProductSku> selectSkusByBody(
            @Param("lengthCm") Integer lengthCm,
            @Param("waistCm") Integer waistCm
    );

    List<ProductSku> selectTopSkusBoughtBySimilarUsers(
            @Param("heightCm") Integer heightCm,
            @Param("waistCm") Integer waistCm
    );

    List<ProductSku> selectAdminSkusBySpuId(@Param("spuId") Long spuId);

    int decreaseStock(@Param("skuId") Long skuId, @Param("quantity") Integer quantity);

    int increaseStock(@Param("skuId") Long skuId, @Param("quantity") Integer quantity);

    @Delete("DELETE FROM product_sku WHERE spu_id = #{spuId}")
    int hardDeleteBySpuId(@Param("spuId") Long spuId);
}