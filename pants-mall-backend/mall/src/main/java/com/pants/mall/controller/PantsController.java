package com.pants.mall.controller;

import com.pants.mall.common.Result;
import com.pants.mall.entity.ProductSku;
import com.pants.mall.mapper.ProductSkuMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/pants")
@RequiredArgsConstructor
public class PantsController {

    private final ProductSkuMapper productSkuMapper;

    @GetMapping("/options")
    public Result<Map<String, Object>> options(@RequestParam("spuId") Long spuId) {
        Map<String, Object> data = new HashMap<>();
        data.put("values", productSkuMapper.selectOptionValuesBySpuId(spuId));
        data.put("skus", productSkuMapper.selectOptionsBySpuId(spuId));
        return Result.ok(data);
    }

    @GetMapping("/search")
    public Result<List<ProductSku>> search(
            @RequestParam(value = "spuId", required = false) Long spuId,
            @RequestParam(value = "color", required = false) String color,
            @RequestParam(value = "size", required = false) String size,
            @RequestParam(value = "lengthCm", required = false) Integer lengthCm,
            @RequestParam(value = "waistCm", required = false) Integer waistCm,
            @RequestParam(value = "legOpeningCm", required = false) Integer legOpeningCm,
            @RequestParam(value = "fitType", required = false) String fitType,
            @RequestParam(value = "minPrice", required = false) BigDecimal minPrice,
            @RequestParam(value = "maxPrice", required = false) BigDecimal maxPrice,
            @RequestParam(value = "limit", required = false) Integer limit
    ) {
        List<ProductSku> list = productSkuMapper.searchPants(
                spuId,
                color,
                size,
                lengthCm,
                waistCm,
                legOpeningCm,
                fitType,
                minPrice,
                maxPrice
        );

        if (limit != null && limit > 0 && list.size() > limit) {
            list = list.subList(0, limit);
        }

        return Result.ok(list);
    }

    @GetMapping("/search-by-length")
    public Result<List<ProductSku>> searchByLength(
            @RequestParam("length") Integer length
    ) {
        return Result.ok(productSkuMapper.searchByLength(length));
    }
}