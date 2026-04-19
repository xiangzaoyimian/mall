package com.pants.mall.service;

import com.pants.mall.dto.OrderCreateReq;
import com.pants.mall.dto.OrderQueryReq;
import com.pants.mall.dto.PageResp;

import java.util.Map;

public interface OrderService {
    Long createOrder(OrderCreateReq req);

    void cancelOrder(Long orderId);

    PageResp<Map<String, Object>> listMyOrders(OrderQueryReq req);

    Map<String, Object> getOrderDetail(Long orderId);

    void payOrder(Long orderId);

    void shipOrder(Long orderId);

    void finishOrder(Long orderId);

    // ===== admin =====
    PageResp<Map<String, Object>> adminListOrders(OrderQueryReq req);

    Map<String, Object> adminGetOrderDetail(Long orderId);

    void adminShipOrder(Long orderId);

    void adminFinishOrder(Long orderId);
}