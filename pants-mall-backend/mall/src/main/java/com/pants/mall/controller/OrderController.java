package com.pants.mall.controller;

import com.pants.mall.common.Result;
import com.pants.mall.dto.OrderCreateReq;
import com.pants.mall.dto.OrderQueryReq;
import com.pants.mall.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    // 创建订单
    @PostMapping
    public Result<Long> create(@RequestBody OrderCreateReq req) {
        return Result.ok(orderService.createOrder(req));
    }

    // 取消订单
    @PostMapping("/{id}/cancel")
    public Result<Void> cancel(@PathVariable("id") Long id) {
        orderService.cancelOrder(id);
        return Result.ok(null);
    }

    // 我的订单列表
    @GetMapping
    public Result<com.pants.mall.dto.PageResp<Map<String, Object>>> list(@ModelAttribute OrderQueryReq req) {
        return Result.ok(orderService.listMyOrders(req));
    }

    // 订单详情
    @GetMapping("/{id}")
    public Result<Map<String, Object>> detail(@PathVariable("id") Long id) {
        return Result.ok(orderService.getOrderDetail(id));
    }

    // 虚拟支付
    @PostMapping("/{id}/pay")
    public Result<Void> pay(@PathVariable("id") Long id) {
        orderService.payOrder(id);
        return Result.ok(null);
    }

    // 确认收货（买家）
    @PostMapping("/{id}/finish")
    public Result<Void> finish(@PathVariable("id") Long id) {
        orderService.finishOrder(id);
        return Result.ok(null);
    }
}