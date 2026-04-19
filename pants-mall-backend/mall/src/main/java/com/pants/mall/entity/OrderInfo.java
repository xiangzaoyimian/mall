package com.pants.mall.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("order_info")
@EqualsAndHashCode(callSuper = true)
public class OrderInfo extends BaseEntity {

    private Long id;

    private String orderNo;

    private Long userId;

    private BigDecimal totalAmount;

    private String status;

    private String addressSnapshot;

    private String remark;

    // 新增字段
    private LocalDateTime paidAt;
}