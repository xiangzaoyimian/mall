package com.pants.mall.dto;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ProductItemResp {

    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long categoryId;

    private String name;
    private String description;
    private String status;
    private Integer sales;
    private String coverUrl;

    private BigDecimal minPrice;
    private BigDecimal maxPrice;
    private Integer totalStock;
}