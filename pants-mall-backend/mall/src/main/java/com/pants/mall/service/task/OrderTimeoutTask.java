package com.pants.mall.service.task;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.pants.mall.common.OrderStatus;
import com.pants.mall.entity.OrderInfo;
import com.pants.mall.entity.OrderItem;
import com.pants.mall.mapper.OrderInfoMapper;
import com.pants.mall.mapper.OrderItemMapper;
import com.pants.mall.mapper.ProductSkuMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class OrderTimeoutTask {

    private final OrderInfoMapper orderInfoMapper;
    private final OrderItemMapper orderItemMapper;
    private final ProductSkuMapper productSkuMapper;

    // 每1分钟执行一次
    @Scheduled(fixedRate = 60000)
    public void cancelTimeoutOrders() {

        LocalDateTime timeout = LocalDateTime.now().minusMinutes(30);

        List<OrderInfo> orders = orderInfoMapper.selectList(
                new QueryWrapper<OrderInfo>()
                        .eq("status", OrderStatus.CREATED)
                        .lt("created_at", timeout)
                        .eq("deleted", 0)
        );

        for (OrderInfo order : orders) {

            List<OrderItem> items = orderItemMapper.selectList(
                    new QueryWrapper<OrderItem>()
                            .eq("order_id", order.getId())
                            .eq("deleted", 0)
            );

            for (OrderItem item : items) {
                productSkuMapper.increaseStock(item.getSkuId(), item.getQuantity());
            }

            order.setStatus(OrderStatus.CANCELED);
            orderInfoMapper.updateById(order);
        }
    }
}