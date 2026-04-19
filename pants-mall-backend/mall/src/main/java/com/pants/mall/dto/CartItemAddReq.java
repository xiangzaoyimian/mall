package com.pants.mall.dto;

import lombok.Data;

@Data
public class CartItemAddReq {
    private Long skuId;
    private Integer quantity;
}
