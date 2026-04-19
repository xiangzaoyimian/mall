package com.pants.mall.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@TableName("product_spu")
@EqualsAndHashCode(callSuper = true)
public class ProductSpu extends BaseEntity {

    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long categoryId;

    private String name;
    private String description;
    private String status;
    private Integer sales;
    private String coverUrl;
}