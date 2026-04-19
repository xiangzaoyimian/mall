package com.pants.mall.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.pants.mall.common.BusinessException;
import com.pants.mall.common.OrderStatus;
import com.pants.mall.dto.OrderCreateReq;
import com.pants.mall.dto.OrderItemReq;
import com.pants.mall.dto.OrderQueryReq;
import com.pants.mall.dto.PageResp;
import com.pants.mall.entity.Address;
import com.pants.mall.entity.AfterSale;
import com.pants.mall.entity.OrderInfo;
import com.pants.mall.entity.OrderItem;
import com.pants.mall.entity.ProductSku;
import com.pants.mall.entity.ProductSpu;
import com.pants.mall.mapper.AddressMapper;
import com.pants.mall.mapper.AfterSaleMapper;
import com.pants.mall.mapper.CartItemMapper;
import com.pants.mall.mapper.OrderInfoMapper;
import com.pants.mall.mapper.OrderItemMapper;
import com.pants.mall.mapper.ProductSkuMapper;
import com.pants.mall.mapper.ProductSpuMapper;
import com.pants.mall.mapper.ReviewMapper;
import com.pants.mall.service.OrderService;
import com.pants.mall.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final SecurityUtil securityUtil;

    private final AddressMapper addressMapper;
    private final CartItemMapper cartItemMapper;
    private final ProductSkuMapper productSkuMapper;
    private final ProductSpuMapper productSpuMapper;

    private final OrderInfoMapper orderInfoMapper;
    private final OrderItemMapper orderItemMapper;
    private final ReviewMapper reviewMapper;
    private final AfterSaleMapper afterSaleMapper;

    @Override
    @Transactional
    public Long createOrder(OrderCreateReq req) {
        Long userId = securityUtil.currentUserId();
        if (userId == null) {
            throw new BusinessException("未登录");
        }

        if (req == null || req.getAddressId() == null) {
            throw new BusinessException("addressId 不能为空");
        }

        List<OrderItemReq> items = req.getItems();
        if (items == null || items.isEmpty()) {
            throw new BusinessException("items 不能为空");
        }

        Address address = addressMapper.selectById(req.getAddressId());
        if (address == null || address.getDeleted() != 0 || !address.getUserId().equals(userId)) {
            throw new BusinessException("收货地址不存在");
        }

        BigDecimal total = BigDecimal.ZERO;

        for (OrderItemReq it : items) {
            if (it.getSkuId() == null || it.getQuantity() == null || it.getQuantity() <= 0) {
                throw new BusinessException("items 参数不合法");
            }

            int rows = productSkuMapper.decreaseStock(it.getSkuId(), it.getQuantity());
            if (rows != 1) {
                ProductSku sku = productSkuMapper.selectById(it.getSkuId());
                Integer stock = (sku == null || sku.getStock() == null) ? 0 : sku.getStock();
                throw new BusinessException("库存不足: skuId=" + it.getSkuId() + " 当前库存=" + stock);
            }

            ProductSku sku = productSkuMapper.selectById(it.getSkuId());
            if (sku == null || sku.getDeleted() != 0) {
                throw new BusinessException("SKU 无效: " + it.getSkuId());
            }

            BigDecimal price = sku.getPrice();
            BigDecimal amount = price.multiply(BigDecimal.valueOf(it.getQuantity()));
            total = total.add(amount);
        }

        OrderInfo order = new OrderInfo();
        order.setOrderNo(genOrderNo());
        order.setUserId(userId);
        order.setTotalAmount(total);
        order.setStatus(OrderStatus.CREATED);
        order.setAddressSnapshot(buildAddressSnapshot(address));
        order.setRemark(null);
        order.setPaidAt(null);

        orderInfoMapper.insert(order);
        Long orderId = order.getId();
        if (orderId == null) {
            throw new BusinessException("创建订单失败（未生成订单ID）");
        }

        for (OrderItemReq it : items) {
            ProductSku sku = productSkuMapper.selectById(it.getSkuId());
            if (sku == null || sku.getDeleted() != 0) {
                throw new BusinessException("SKU 无效: " + it.getSkuId());
            }

            ProductSpu spu = productSpuMapper.selectById(sku.getSpuId());
            if (spu == null || spu.getDeleted() != 0) {
                throw new BusinessException("SPU 无效: " + sku.getSpuId());
            }

            BigDecimal price = sku.getPrice();
            BigDecimal amount = price.multiply(BigDecimal.valueOf(it.getQuantity()));

            OrderItem oi = new OrderItem();
            oi.setOrderId(orderId);
            oi.setSpuId(spu.getId());
            oi.setSkuId(sku.getId());
            oi.setSkuTitle(sku.getTitle());
            oi.setPrice(price);
            oi.setQuantity(it.getQuantity());
            oi.setAmount(amount);

            orderItemMapper.insert(oi);
        }

        for (OrderItemReq it : items) {
            cartItemMapper.deleteByUserIdAndSkuIdPhysical(userId, it.getSkuId());
        }

        return orderId;
    }

    @Override
    @Transactional
    public void cancelOrder(Long orderId) {
        Long userId = securityUtil.currentUserId();
        if (userId == null) {
            throw new BusinessException("未登录");
        }
        if (orderId == null) {
            throw new BusinessException("订单ID不能为空");
        }

        OrderInfo order = orderInfoMapper.selectById(orderId);
        if (order == null || order.getDeleted() != 0) {
            throw new BusinessException("订单不存在");
        }
        if (!order.getUserId().equals(userId)) {
            throw new BusinessException("无权限取消该订单");
        }

        if (OrderStatus.CANCELED.equals(order.getStatus())) {
            return;
        }
        if (!OrderStatus.CREATED.equals(order.getStatus())) {
            throw new BusinessException("当前状态不可取消: " + order.getStatus());
        }

        List<OrderItem> items = orderItemMapper.selectList(
                new QueryWrapper<OrderItem>()
                        .eq("order_id", orderId)
                        .eq("deleted", 0)
        );

        for (OrderItem it : items) {
            productSkuMapper.increaseStock(it.getSkuId(), it.getQuantity());
        }

        order.setStatus(OrderStatus.CANCELED);
        orderInfoMapper.updateById(order);
    }

    @Override
    public PageResp<Map<String, Object>> listMyOrders(OrderQueryReq req) {
        Long userId = securityUtil.currentUserId();
        if (userId == null) {
            throw new BusinessException("未登录");
        }

        int pageNo = (req == null || req.getPage() == null || req.getPage() <= 0) ? 1 : req.getPage();
        int pageSize = (req == null || req.getSize() == null || req.getSize() <= 0) ? 10 : req.getSize();
        if (pageSize > 50) {
            pageSize = 50;
        }

        com.baomidou.mybatisplus.extension.plugins.pagination.Page<OrderInfo> page =
                new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(pageNo, pageSize);

        QueryWrapper<OrderInfo> qw = new QueryWrapper<OrderInfo>()
                .eq("user_id", userId)
                .eq("deleted", 0);

        if (req != null && req.getStatus() != null && !req.getStatus().isBlank()) {
            qw.eq("status", req.getStatus().trim());
        }
        if (req != null && req.getOrderNo() != null && !req.getOrderNo().isBlank()) {
            qw.like("order_no", req.getOrderNo().trim());
        }

        qw.orderByDesc("created_at");
        orderInfoMapper.selectPage(page, qw);

        List<Map<String, Object>> list = page.getRecords().stream().map(o -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", o.getId() == null ? null : String.valueOf(o.getId()));
            m.put("orderNo", o.getOrderNo());
            m.put("totalAmount", o.getTotalAmount());
            m.put("status", o.getStatus());
            m.put("paidAt", o.getPaidAt());
            m.put("createdAt", o.getCreatedAt());

            AfterSale afterSale = afterSaleMapper.selectOne(
                    new QueryWrapper<AfterSale>()
                            .eq("order_id", o.getId())
                            .eq("deleted", 0)
                            .last("limit 1")
            );
            if (afterSale != null) {
                Map<String, Object> afterSaleMap = new HashMap<>();
                afterSaleMap.put("id", afterSale.getId() == null ? null : String.valueOf(afterSale.getId()));
                afterSaleMap.put("type", afterSale.getType());
                afterSaleMap.put("status", afterSale.getStatus());
                afterSaleMap.put("reason", afterSale.getReason());
                afterSaleMap.put("description", afterSale.getDescription());
                afterSaleMap.put("adminRemark", afterSale.getAdminRemark());
                afterSaleMap.put("createdAt", afterSale.getCreatedAt());
                m.put("afterSale", afterSaleMap);
            } else {
                m.put("afterSale", null);
            }

            return m;
        }).toList();

        return PageResp.of(page.getTotal(), pageNo, pageSize, list);
    }

    @Override
    public Map<String, Object> getOrderDetail(Long orderId) {
        Long userId = securityUtil.currentUserId();
        if (userId == null) {
            throw new BusinessException("未登录");
        }
        if (orderId == null) {
            throw new BusinessException("订单ID不能为空");
        }

        OrderInfo order = orderInfoMapper.selectById(orderId);
        if (order == null || order.getDeleted() != 0) {
            throw new BusinessException("订单不存在");
        }
        if (!order.getUserId().equals(userId)) {
            throw new BusinessException("无权限查看该订单");
        }

        List<OrderItem> items = orderItemMapper.selectList(
                new QueryWrapper<OrderItem>()
                        .eq("order_id", orderId)
                        .eq("deleted", 0)
        );

        List<Map<String, Object>> itemList = items.stream().map(oi -> {
            Map<String, Object> m = new HashMap<>();

            ProductSpu spu = oi.getSpuId() == null ? null : productSpuMapper.selectById(oi.getSpuId());
            boolean reviewed = false;
            if (oi.getSpuId() != null && oi.getSkuId() != null) {
                Long reviewCount = reviewMapper.selectCount(
                        new QueryWrapper<com.pants.mall.entity.Review>()
                                .eq("deleted", 0)
                                .eq("user_id", userId)
                                .eq("order_id", orderId)
                                .eq("spu_id", oi.getSpuId())
                                .eq("sku_id", oi.getSkuId())
                );
                reviewed = reviewCount != null && reviewCount > 0;
            }

            m.put("skuId", oi.getSkuId() == null ? null : String.valueOf(oi.getSkuId()));
            m.put("spuId", oi.getSpuId() == null ? null : String.valueOf(oi.getSpuId()));
            m.put("skuTitle", oi.getSkuTitle());
            m.put("title", spu == null ? oi.getSkuTitle() : spu.getName());
            m.put("spuName", spu == null ? null : spu.getName());
            m.put("spuDescription", spu == null ? null : spu.getDescription());
            m.put("coverUrl", spu == null ? null : spu.getCoverUrl());
            m.put("price", oi.getPrice());
            m.put("quantity", oi.getQuantity());
            m.put("amount", oi.getAmount());
            m.put("reviewed", reviewed);
            return m;
        }).toList();

        Map<String, Object> data = new HashMap<>();
        data.put("id", order.getId() == null ? null : String.valueOf(order.getId()));
        data.put("orderNo", order.getOrderNo());
        data.put("userId", order.getUserId() == null ? null : String.valueOf(order.getUserId()));
        data.put("totalAmount", order.getTotalAmount());
        data.put("status", order.getStatus());
        data.put("paidAt", order.getPaidAt());
        data.put("createdAt", order.getCreatedAt());
        data.put("items", itemList);

        AfterSale afterSale = afterSaleMapper.selectOne(
                new QueryWrapper<AfterSale>()
                        .eq("order_id", orderId)
                        .eq("deleted", 0)
                        .last("limit 1")
        );
        if (afterSale != null) {
            Map<String, Object> afterSaleMap = new HashMap<>();
            afterSaleMap.put("id", afterSale.getId() == null ? null : String.valueOf(afterSale.getId()));
            afterSaleMap.put("type", afterSale.getType());
            afterSaleMap.put("status", afterSale.getStatus());
            afterSaleMap.put("reason", afterSale.getReason());
            afterSaleMap.put("description", afterSale.getDescription());
            afterSaleMap.put("adminRemark", afterSale.getAdminRemark());
            afterSaleMap.put("createdAt", afterSale.getCreatedAt());
            data.put("afterSale", afterSaleMap);
        } else {
            data.put("afterSale", null);
        }

        return data;
    }

    @Override
    @Transactional
    public void payOrder(Long orderId) {
        Long userId = securityUtil.currentUserId();
        if (userId == null) {
            throw new BusinessException("未登录");
        }
        if (orderId == null) {
            throw new BusinessException("订单ID不能为空");
        }

        OrderInfo order = orderInfoMapper.selectById(orderId);
        if (order == null || order.getDeleted() != 0) {
            throw new BusinessException("订单不存在");
        }
        if (!order.getUserId().equals(userId)) {
            throw new BusinessException("无权限支付该订单");
        }

        if (OrderStatus.CANCELED.equals(order.getStatus())) {
            throw new BusinessException("订单已取消，无法支付");
        }
        if (!OrderStatus.CREATED.equals(order.getStatus())) {
            throw new BusinessException("当前状态不可支付: " + order.getStatus());
        }

        order.setStatus(OrderStatus.PAID);
        order.setPaidAt(LocalDateTime.now());
        orderInfoMapper.updateById(order);
    }

    @Override
    @Transactional
    public void shipOrder(Long orderId) {
        Long userId = securityUtil.currentUserId();
        if (userId == null) {
            throw new BusinessException("未登录");
        }
        if (orderId == null) {
            throw new BusinessException("订单ID不能为空");
        }

        OrderInfo order = orderInfoMapper.selectById(orderId);
        if (order == null || order.getDeleted() != 0) {
            throw new BusinessException("订单不存在");
        }
        if (!order.getUserId().equals(userId)) {
            throw new BusinessException("无权限发货该订单");
        }

        if (!OrderStatus.PAID.equals(order.getStatus())) {
            throw new BusinessException("当前状态不可发货: " + order.getStatus());
        }

        order.setStatus(OrderStatus.SHIPPED);
        orderInfoMapper.updateById(order);
    }

    @Override
    @Transactional
    public void finishOrder(Long orderId) {
        Long userId = securityUtil.currentUserId();
        if (userId == null) {
            throw new BusinessException("未登录");
        }
        if (orderId == null) {
            throw new BusinessException("订单ID不能为空");
        }

        OrderInfo order = orderInfoMapper.selectById(orderId);
        if (order == null || order.getDeleted() != 0) {
            throw new BusinessException("订单不存在");
        }
        if (!order.getUserId().equals(userId)) {
            throw new BusinessException("无权限确认该订单");
        }

        if (!OrderStatus.SHIPPED.equals(order.getStatus())) {
            throw new BusinessException("当前状态不可确认收货: " + order.getStatus());
        }

        order.setStatus(OrderStatus.FINISHED);
        orderInfoMapper.updateById(order);
    }

    private String genOrderNo() {
        String date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        int r = (int) (Math.random() * 900000) + 100000;
        return date + r;
    }

    private String buildAddressSnapshot(Address a) {
        return a.getReceiver() + "，" + a.getPhone() + "，"
                + a.getProvince() + a.getCity() + a.getDistrict() + a.getDetail();
    }

    @Override
    public PageResp<Map<String, Object>> adminListOrders(OrderQueryReq req) {
        int pageNo = (req == null || req.getPage() == null || req.getPage() <= 0) ? 1 : req.getPage();
        int pageSize = (req == null || req.getSize() == null || req.getSize() <= 0) ? 10 : req.getSize();
        if (pageSize > 50) {
            pageSize = 50;
        }

        com.baomidou.mybatisplus.extension.plugins.pagination.Page<OrderInfo> page =
                new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(pageNo, pageSize);

        QueryWrapper<OrderInfo> qw = new QueryWrapper<OrderInfo>()
                .eq("deleted", 0);

        if (req != null && req.getStatus() != null && !req.getStatus().isBlank()) {
            qw.eq("status", req.getStatus().trim());
        }
        if (req != null && req.getOrderNo() != null && !req.getOrderNo().isBlank()) {
            qw.like("order_no", req.getOrderNo().trim());
        }

        qw.orderByDesc("created_at");
        orderInfoMapper.selectPage(page, qw);

        List<Map<String, Object>> list = page.getRecords().stream().map(o -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", o.getId() == null ? null : String.valueOf(o.getId()));
            m.put("orderNo", o.getOrderNo());
            m.put("userId", o.getUserId() == null ? null : String.valueOf(o.getUserId()));
            m.put("totalAmount", o.getTotalAmount());
            m.put("status", o.getStatus());
            m.put("addressSnapshot", o.getAddressSnapshot());
            m.put("remark", o.getRemark());
            m.put("paidAt", o.getPaidAt());
            m.put("createdAt", o.getCreatedAt());
            return m;
        }).toList();

        return PageResp.of(page.getTotal(), pageNo, pageSize, list);
    }

    @Override
    public Map<String, Object> adminGetOrderDetail(Long orderId) {
        if (orderId == null) {
            throw new BusinessException("订单ID不能为空");
        }

        OrderInfo order = orderInfoMapper.selectById(orderId);
        if (order == null || order.getDeleted() != 0) {
            throw new BusinessException("订单不存在");
        }

        List<OrderItem> items = orderItemMapper.selectList(
                new QueryWrapper<OrderItem>()
                        .eq("order_id", orderId)
                        .eq("deleted", 0)
        );

        List<Map<String, Object>> itemList = items.stream().map(oi -> {
            Map<String, Object> m = new HashMap<>();
            m.put("skuId", oi.getSkuId() == null ? null : String.valueOf(oi.getSkuId()));
            m.put("spuId", oi.getSpuId() == null ? null : String.valueOf(oi.getSpuId()));
            m.put("title", oi.getSkuTitle());
            m.put("skuTitle", oi.getSkuTitle());
            m.put("price", oi.getPrice());
            m.put("quantity", oi.getQuantity());
            m.put("amount", oi.getAmount());
            return m;
        }).toList();

        Map<String, Object> data = new HashMap<>();
        data.put("id", order.getId() == null ? null : String.valueOf(order.getId()));
        data.put("orderNo", order.getOrderNo());
        data.put("userId", order.getUserId() == null ? null : String.valueOf(order.getUserId()));
        data.put("totalAmount", order.getTotalAmount());
        data.put("status", order.getStatus());
        data.put("addressSnapshot", order.getAddressSnapshot());
        data.put("remark", order.getRemark());
        data.put("paidAt", order.getPaidAt());
        data.put("createdAt", order.getCreatedAt());
        data.put("items", itemList);

        AfterSale afterSale = afterSaleMapper.selectOne(
                new QueryWrapper<AfterSale>()
                        .eq("order_id", orderId)
                        .eq("deleted", 0)
                        .last("limit 1")
        );
        if (afterSale != null) {
            Map<String, Object> afterSaleMap = new HashMap<>();
            afterSaleMap.put("id", afterSale.getId() == null ? null : String.valueOf(afterSale.getId()));
            afterSaleMap.put("type", afterSale.getType());
            afterSaleMap.put("status", afterSale.getStatus());
            afterSaleMap.put("reason", afterSale.getReason());
            afterSaleMap.put("description", afterSale.getDescription());
            afterSaleMap.put("adminRemark", afterSale.getAdminRemark());
            afterSaleMap.put("createdAt", afterSale.getCreatedAt());
            data.put("afterSale", afterSaleMap);
        } else {
            data.put("afterSale", null);
        }

        return data;
    }

    @Override
    @Transactional
    public void adminShipOrder(Long orderId) {
        if (orderId == null) {
            throw new BusinessException("订单ID不能为空");
        }

        OrderInfo order = orderInfoMapper.selectById(orderId);
        if (order == null || order.getDeleted() != 0) {
            throw new BusinessException("订单不存在");
        }

        if (!OrderStatus.PAID.equals(order.getStatus())) {
            throw new BusinessException("当前状态不可发货: " + order.getStatus());
        }

        order.setStatus(OrderStatus.SHIPPED);
        orderInfoMapper.updateById(order);
    }

    @Override
    @Transactional
    public void adminFinishOrder(Long orderId) {
        if (orderId == null) {
            throw new BusinessException("订单ID不能为空");
        }

        OrderInfo order = orderInfoMapper.selectById(orderId);
        if (order == null || order.getDeleted() != 0) {
            throw new BusinessException("订单不存在");
        }

        if (!OrderStatus.SHIPPED.equals(order.getStatus())) {
            throw new BusinessException("当前状态不可完成: " + order.getStatus());
        }

        order.setStatus(OrderStatus.FINISHED);
        orderInfoMapper.updateById(order);
    }
}