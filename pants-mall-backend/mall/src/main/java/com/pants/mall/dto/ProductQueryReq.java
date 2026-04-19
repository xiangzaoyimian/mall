package com.pants.mall.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class ProductQueryReq {
    private Integer pageNo = 1;
    private Integer pageSize = 10;
    private String keyword;
    private Long categoryId;
    private String status;
    private BigDecimal minPrice;
    private BigDecimal maxPrice;

    private String color;
    private String colorFamily;
    private List<String> colorValues;

    private String size;
    private String sortBy;
    private String sortOrder;

    private Boolean onlyInStock;

    private Integer lengthMin;
    private Integer lengthMax;
    private Integer waistMin;
    private Integer waistMax;
    private Integer legOpeningMin;
    private Integer legOpeningMax;
    private String fitType;
}