package com.pants.mall.dto;

import lombok.Data;

@Data
public class OrderQueryReq {
    // 默认第 1 页
    private Integer page = 1;
    // 默认每页 10 条
    private Integer size = 10;

    // 可选：按状态筛选 CREATED / CANCELED / PAID / SHIPPED / FINISHED ...
    private String status;

    // 可选：按订单号模糊查
    private String orderNo;
}