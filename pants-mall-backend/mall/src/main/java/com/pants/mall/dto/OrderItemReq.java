package com.pants.mall.dto;

import lombok.Data;

@Data
public class OrderItemReq {
    private Long skuId;
    private Integer quantity;
}
