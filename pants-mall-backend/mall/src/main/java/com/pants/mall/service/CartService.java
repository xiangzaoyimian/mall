package com.pants.mall.service;

import com.pants.mall.dto.CartItemAddReq;
import com.pants.mall.dto.CartItemUpdateReq;

import java.util.List;
import java.util.Map;

public interface CartService {
    void addItem(CartItemAddReq req);
    void updateItem(CartItemUpdateReq req);
    List<Map<String, Object>> listItems();
}
