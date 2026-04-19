package com.pants.mall.service;

import com.pants.mall.common.Result;

public interface FavoriteService {

    Result<?> addFavorite(Long spuId);

    Result<?> removeFavorite(Long spuId);

    Result<?> listMyFavorites();
}