package com.pants.mall.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@TableName("after_sale")
@EqualsAndHashCode(callSuper = true)
public class AfterSale extends BaseEntity {

    private Long id;

    private Long orderId;

    private String orderNo;

    private Long userId;

    /**
     * 售后类型：
     * REFUND：退款
     * RETURN_REFUND：退货退款
     */
    private String type;

    private String reason;

    private String description;

    /**
     * 售后状态：
     * PENDING：待审核
     * APPROVED：审核通过，等待用户退货（仅退货退款）
     * RETURNED：用户已退货，等待商家确认收货退款（仅退货退款）
     * COMPLETED：售后完成
     * REJECTED：审核拒绝
     */
    private String status;

    private String adminRemark;
}