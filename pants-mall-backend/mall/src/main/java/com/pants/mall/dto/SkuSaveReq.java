package com.pants.mall.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class SkuSaveReq {

    private String skuCode;
    private String title;
    private BigDecimal price;
    private Integer stock;

    private String color;
    private String size;
    private String status;

    private Integer lengthCm;
    private Integer waistCm;
    private Integer legOpeningCm;
    private String fitType;
}