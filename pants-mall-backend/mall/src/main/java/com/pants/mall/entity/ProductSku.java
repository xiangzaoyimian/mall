package com.pants.mall.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

@Data
@TableName("product_sku")
@EqualsAndHashCode(callSuper = true)
public class ProductSku extends BaseEntity {

    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long spuId;

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