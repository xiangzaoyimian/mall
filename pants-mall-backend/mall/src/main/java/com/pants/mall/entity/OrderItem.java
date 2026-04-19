package com.pants.mall.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

@Data
@TableName("order_item")
@EqualsAndHashCode(callSuper = true)
public class OrderItem extends BaseEntity {
    private Long id;
    private Long orderId;
    private Long spuId;
    private Long skuId;
    private String skuTitle;
    private BigDecimal price;
    private Integer quantity;
    private BigDecimal amount;
}
