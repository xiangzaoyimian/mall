package com.pants.mall.common;

/**
 * 售后状态常量
 */
public class AfterSaleStatus {

    /**
     * 待审核
     */
    public static final String PENDING = "PENDING";

    /**
     * 已通过（对退货退款表示：审核通过，等待用户退货）
     */
    public static final String APPROVED = "APPROVED";

    /**
     * 用户已退货
     */
    public static final String RETURNED = "RETURNED";

    /**
     * 已完成
     */
    public static final String COMPLETED = "COMPLETED";

    /**
     * 已拒绝
     */
    public static final String REJECTED = "REJECTED";

    private AfterSaleStatus() {
    }
}