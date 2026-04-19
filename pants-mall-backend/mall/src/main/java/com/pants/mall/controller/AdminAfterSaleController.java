package com.pants.mall.controller;

import com.pants.mall.common.Result;
import com.pants.mall.dto.AfterSaleAuditReq;
import com.pants.mall.dto.AfterSaleQueryReq;
import com.pants.mall.dto.PageResp;
import com.pants.mall.service.AfterSaleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/admin/after-sales")
@RequiredArgsConstructor
public class AdminAfterSaleController {

    private final AfterSaleService afterSaleService;

    @GetMapping
    public Result<PageResp<Map<String, Object>>> list(AfterSaleQueryReq req) {
        return Result.ok(afterSaleService.adminListAfterSales(req));
    }

    @GetMapping("/{id}")
    public Result<Map<String, Object>> detail(@PathVariable("id") Long id) {
        return Result.ok(afterSaleService.adminGetAfterSaleDetail(id));
    }

    @PutMapping("/{id}/audit")
    public Result<Void> audit(@PathVariable("id") Long id,
                              @RequestBody @Valid AfterSaleAuditReq req) {
        afterSaleService.adminAudit(id, req);
        return Result.ok(null);
    }

    /**
     * 管理员确认收货并退款（仅退货退款）
     */
    @PutMapping("/{id}/receive")
    public Result<Void> receiveAndRefund(@PathVariable("id") Long id) {
        afterSaleService.adminReceiveAndRefund(id);
        return Result.ok(null);
    }
}