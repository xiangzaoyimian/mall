package com.pants.mall.dto;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class RecommendItemResp {

    @JsonSerialize(using = ToStringSerializer.class)
    private Long spuId;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long skuId;

    private String name;
    private BigDecimal price;
    private String coverUrl;
    private Integer stock;
    private String fitType;
    private Integer lengthCm;
    private Integer waistCm;
    private String reason;
    private Integer matchScore;

    /**
     * 推荐类型：
     * BEST = 强推荐
     * GOOD = 推荐
     * FALLBACK = 可参考
     */
    private String recommendType;
}