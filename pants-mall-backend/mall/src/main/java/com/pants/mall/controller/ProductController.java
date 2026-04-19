package com.pants.mall.controller;

import com.pants.mall.common.Result;
import com.pants.mall.dto.ProductCompareResp;
import com.pants.mall.dto.ProductListResp;
import com.pants.mall.dto.ProductQueryReq;
import com.pants.mall.entity.ProductSpu;
import com.pants.mall.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public Result<ProductListResp> query(ProductQueryReq req) {
        return Result.ok(productService.query(req));
    }

    @GetMapping("/compare")
    public Result<List<ProductCompareResp>> compare(@RequestParam("spuIds") List<Long> spuIds) {
        return Result.ok(productService.compareBySpuIds(spuIds));
    }

    @GetMapping("/{id}")
    public Result<ProductSpu> detail(@PathVariable("id") Long id) {
        return Result.ok(productService.getById(id));
    }
}