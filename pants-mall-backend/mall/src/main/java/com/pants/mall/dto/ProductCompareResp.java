package com.pants.mall.dto;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class ProductCompareResp {

    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long categoryId;

    private String name;
    private String description;
    private String coverUrl;
    private Integer sales;

    private BigDecimal minPrice;
    private BigDecimal maxPrice;
    private Integer totalStock;
    private Boolean inStock;

    private List<String> colors;
    private List<String> sizes;
    private List<String> fitTypes;

    private Integer minWaistCm;
    private Integer maxWaistCm;
    private Integer minLengthCm;
    private Integer maxLengthCm;
    private Integer minLegOpeningCm;
    private Integer maxLegOpeningCm;

    private BigDecimal avgRating;
    private Integer reviewCount;
    private Integer goodReviewCount;
    private BigDecimal goodReviewRate;
}