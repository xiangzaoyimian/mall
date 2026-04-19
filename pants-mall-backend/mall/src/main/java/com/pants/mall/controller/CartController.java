package com.pants.mall.controller;

import com.pants.mall.common.Result;
import com.pants.mall.dto.CartItemAddReq;
import com.pants.mall.dto.CartItemUpdateReq;
import com.pants.mall.service.CartService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/cart")
@RequiredArgsConstructor
public class CartController {
    private final CartService cartService;

    @PostMapping("/items")
    public Result<Void> add(@RequestBody CartItemAddReq req) {
        cartService.addItem(req);
        return Result.ok(null);
    }

    @PutMapping("/items")
    public Result<Void> update(@RequestBody CartItemUpdateReq req) {
        cartService.updateItem(req);
        return Result.ok(null);
    }

    @GetMapping("/items")
    public Result<List<Map<String, Object>>> list() {
        return Result.ok(cartService.listItems());
    }
}
