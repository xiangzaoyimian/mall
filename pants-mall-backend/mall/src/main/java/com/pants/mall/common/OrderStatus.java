package com.pants.mall.common;

/**
 * 订单状态（简化版，毕业设计够用）
 */
public class OrderStatus {
    // 已创建（待支付）
    public static final String CREATED = "CREATED";
    // 已支付
    public static final String PAID = "PAID";
    // 已发货
    public static final String SHIPPED = "SHIPPED";
    // 已完成
    public static final String FINISHED = "FINISHED";
    // 已取消
    public static final String CANCELED = "CANCELED";
    // 已退款（售后审核通过后的结果态）
    public static final String REFUNDED = "REFUNDED";
}