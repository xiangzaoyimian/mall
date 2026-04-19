package com.pants.mall.controller;

import com.pants.mall.common.Constants;
import com.pants.mall.common.Result;
import com.pants.mall.dto.AdminSpuDetailResp;
import com.pants.mall.dto.ProductListResp;
import com.pants.mall.dto.ProductQueryReq;
import com.pants.mall.dto.SpuSaveReq;
import com.pants.mall.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/spu")
@RequiredArgsConstructor
public class AdminProductController {

    private final ProductService productService;

    @GetMapping
    public Result<ProductListResp> list(ProductQueryReq req) {
        return Result.ok(productService.adminQuery(req));
    }

    @GetMapping("/{id}")
    public Result<AdminSpuDetailResp> detail(@PathVariable("id") Long id) {
        return Result.ok(productService.getAdminDetailById(id));
    }

    @PostMapping
    public Result<Long> create(@RequestBody SpuSaveReq req) {
        return Result.ok(productService.createSpu(req));
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable("id") Long id, @RequestBody SpuSaveReq req) {
        productService.updateSpu(id, req);
        return Result.ok(null);
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable("id") Long id) {
        productService.deleteSpu(id);
        return Result.ok(null);
    }

    @PutMapping("/{id}/on")
    public Result<Void> on(@PathVariable("id") Long id) {
        productService.updateStatus(id, Constants.STATUS_ON);
        return Result.ok(null);
    }

    @PutMapping("/{id}/off")
    public Result<Void> off(@PathVariable("id") Long id) {
        productService.updateStatus(id, Constants.STATUS_OFF);
        return Result.ok(null);
    }
}