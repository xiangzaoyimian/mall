package com.pants.mall.controller;

import com.pants.mall.common.Result;
import com.pants.mall.service.FavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

    // 收藏
    @PostMapping("/{spuId}")
    public Result<?> add(@PathVariable("spuId") Long spuId) {
        return favoriteService.addFavorite(spuId);
    }

    // 取消收藏
    @DeleteMapping("/{spuId}")
    public Result<?> remove(@PathVariable("spuId") Long spuId) {
        return favoriteService.removeFavorite(spuId);
    }

    // 我的收藏列表
    @GetMapping
    public Result<?> list() {
        return favoriteService.listMyFavorites();
    }
}