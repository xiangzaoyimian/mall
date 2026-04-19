package com.pants.mall.dto;

import lombok.Data;

import java.util.List;

@Data
public class OrderCreateReq {
    private Long addressId;
    private List<OrderItemReq> items;
}
