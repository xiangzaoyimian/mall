package com.pants.mall.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

@Data
@TableName("payment")
@EqualsAndHashCode(callSuper = true)
public class Payment extends BaseEntity {
    private Long id;
    private Long orderId;
    private String payNo;
    private BigDecimal amount;
    private String status;
    private String payType;
}
