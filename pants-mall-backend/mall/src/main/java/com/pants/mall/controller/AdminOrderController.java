package com.pants.mall.controller;

import com.pants.mall.common.Result;
import com.pants.mall.dto.OrderQueryReq;
import com.pants.mall.dto.PageResp;
import com.pants.mall.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/admin/orders")
@RequiredArgsConstructor
public class AdminOrderController {

    private final OrderService orderService;

    @GetMapping
    public Result<PageResp<Map<String, Object>>> list(OrderQueryReq req) {
        return Result.ok(orderService.adminListOrders(req));
    }

    @GetMapping("/{id}")
    public Result<Map<String, Object>> detail(@PathVariable("id") Long id) {
        return Result.ok(orderService.adminGetOrderDetail(id));
    }

    @PutMapping("/{id}/ship")
    public Result<Void> ship(@PathVariable("id") Long id) {
        orderService.adminShipOrder(id);
        return Result.ok(null);
    }

    @PutMapping("/{id}/finish")
    public Result<Void> finish(@PathVariable("id") Long id) {
        orderService.adminFinishOrder(id);
        return Result.ok(null);
    }
}