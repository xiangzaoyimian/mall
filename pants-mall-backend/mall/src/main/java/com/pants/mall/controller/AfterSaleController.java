package com.pants.mall.controller;

import com.pants.mall.common.Result;
import com.pants.mall.dto.AfterSaleCreateReq;
import com.pants.mall.service.AfterSaleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
public class AfterSaleController {

    private final AfterSaleService afterSaleService;

    /**
     * 用户对某个订单发起售后申请
     */
    @PostMapping("/{id}/after-sale")
    public Result<Long> createAfterSale(@PathVariable("id") Long orderId,
                                        @RequestBody @Valid AfterSaleCreateReq req) {
        return Result.ok(afterSaleService.createAfterSale(orderId, req));
    }

    /**
     * 查看当前订单的售后信息（我的）
     */
    @GetMapping("/{id}/after-sale")
    public Result<Map<String, Object>> getMyAfterSale(@PathVariable("id") Long orderId) {
        return Result.ok(afterSaleService.getMyAfterSaleByOrderId(orderId));
    }

    /**
     * 用户确认已退货（仅退货退款）
     */
    @PostMapping("/{id}/after-sale/returned")
    public Result<Void> markReturned(@PathVariable("id") Long orderId) {
        afterSaleService.userMarkReturned(orderId);
        return Result.ok(null);
    }
}