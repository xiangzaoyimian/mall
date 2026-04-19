package com.pants.mall.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.pants.mall.common.BusinessException;
import com.pants.mall.dto.CartItemAddReq;
import com.pants.mall.dto.CartItemUpdateReq;
import com.pants.mall.entity.CartItem;
import com.pants.mall.entity.ProductSku;
import com.pants.mall.entity.ProductSpu;
import com.pants.mall.mapper.CartItemMapper;
import com.pants.mall.mapper.ProductSkuMapper;
import com.pants.mall.mapper.ProductSpuMapper;
import com.pants.mall.service.CartService;
import com.pants.mall.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CartServiceImpl implements CartService {

    private final CartItemMapper cartItemMapper;
    private final ProductSkuMapper productSkuMapper;
    private final ProductSpuMapper productSpuMapper;
    private final SecurityUtil securityUtil;

    @Override
    public void addItem(CartItemAddReq req) {
        Long userId = securityUtil.currentUserId();
        if (userId == null) {
            throw new BusinessException("未登录");
        }

        if (req == null || req.getSkuId() == null) {
            throw new BusinessException("skuId 不能为空");
        }

        if (req.getQuantity() == null || req.getQuantity() <= 0) {
            throw new BusinessException("加入购物车数量必须大于 0");
        }

        ProductSku sku = productSkuMapper.selectById(req.getSkuId());
        if (sku == null || sku.getDeleted() != 0) {
            throw new BusinessException("SKU 无效");
        }
        if (!"ON".equalsIgnoreCase(sku.getStatus())) {
            throw new BusinessException("当前 SKU 已下架");
        }

        int stock = sku.getStock() == null ? 0 : sku.getStock();
        if (stock <= 0) {
            throw new BusinessException("当前 SKU 已无库存");
        }

        CartItem exist = cartItemMapper.selectOne(
                new QueryWrapper<CartItem>()
                        .eq("user_id", userId)
                        .eq("sku_id", req.getSkuId())
                        .eq("deleted", 0)
                        .last("limit 1")
        );

        if (exist != null) {
            int nextQty = (exist.getQuantity() == null ? 0 : exist.getQuantity()) + req.getQuantity();
            if (nextQty > stock) {
                throw new BusinessException("购物车数量不能超过库存，当前库存=" + stock);
            }
            exist.setQuantity(nextQty);
            cartItemMapper.updateById(exist);
            return;
        }

        if (req.getQuantity() > stock) {
            throw new BusinessException("加入数量不能超过库存，当前库存=" + stock);
        }

        CartItem item = new CartItem();
        item.setUserId(userId);
        item.setSkuId(req.getSkuId());
        item.setQuantity(req.getQuantity());
        cartItemMapper.insert(item);
    }

    @Override
    public void updateItem(CartItemUpdateReq req) {
        Long userId = securityUtil.currentUserId();
        if (userId == null) {
            throw new BusinessException("未登录");
        }

        if (req == null || req.getId() == null) {
            throw new BusinessException("购物车项 id 不能为空");
        }

        CartItem item = cartItemMapper.selectById(req.getId());
        if (item == null || item.getDeleted() != 0 || !item.getUserId().equals(userId)) {
            throw new BusinessException("购物车项不存在");
        }

        Integer quantity = req.getQuantity();
        if (quantity == null || quantity <= 0) {
            cartItemMapper.deleteById(item.getId());
            return;
        }

        ProductSku sku = productSkuMapper.selectById(item.getSkuId());
        if (sku == null || sku.getDeleted() != 0) {
            throw new BusinessException("SKU 不存在");
        }
        if (!"ON".equalsIgnoreCase(sku.getStatus())) {
            throw new BusinessException("当前 SKU 已下架");
        }

        int stock = sku.getStock() == null ? 0 : sku.getStock();
        if (stock <= 0) {
            throw new BusinessException("当前 SKU 已无库存");
        }
        if (quantity > stock) {
            throw new BusinessException("购物车数量不能超过库存，当前库存=" + stock);
        }

        item.setQuantity(quantity);
        cartItemMapper.updateById(item);
    }

    @Override
    public List<Map<String, Object>> listItems() {
        Long userId = securityUtil.currentUserId();
        if (userId == null) {
            throw new BusinessException("未登录");
        }

        List<CartItem> items = cartItemMapper.selectList(
                new QueryWrapper<CartItem>()
                        .eq("user_id", userId)
                        .eq("deleted", 0)
                        .gt("quantity", 0)
        );

        return items.stream().map(i -> {
            ProductSku sku = productSkuMapper.selectById(i.getSkuId());

            Map<String, Object> map = new HashMap<>();
            map.put("id", i.getId() == null ? null : String.valueOf(i.getId()));
            map.put("skuId", i.getSkuId() == null ? null : String.valueOf(i.getSkuId()));
            map.put("quantity", i.getQuantity());

            if (sku != null) {
                map.put("spuId", sku.getSpuId() == null ? null : String.valueOf(sku.getSpuId()));
                map.put("title", sku.getTitle());
                map.put("price", sku.getPrice());
                map.put("stock", sku.getStock());
                map.put("color", sku.getColor());
                map.put("size", sku.getSize());
                map.put("lengthCm", sku.getLengthCm());

                ProductSpu spu = productSpuMapper.selectById(sku.getSpuId());
                if (spu != null && (spu.getDeleted() == null || spu.getDeleted() == 0)) {
                    map.put("coverUrl", spu.getCoverUrl());
                    map.put("spuName", spu.getName());
                    map.put("spuDescription", spu.getDescription());
                }
            }

            return map;
        }).toList();
    }
}