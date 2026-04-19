package com.pants.mall.dto;

import lombok.Data;

@Data
public class CartItemUpdateReq {
    private Long id;
    private Integer quantity;
}
