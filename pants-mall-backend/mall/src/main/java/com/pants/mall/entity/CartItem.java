package com.pants.mall.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@TableName("cart_item")
@EqualsAndHashCode(callSuper = true)
public class CartItem extends BaseEntity {
    private Long id;
    private Long userId;
    private Long skuId;
    private Integer quantity;
}
