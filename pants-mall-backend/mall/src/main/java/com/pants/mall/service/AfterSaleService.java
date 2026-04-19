package com.pants.mall.service;

import com.pants.mall.dto.AfterSaleAuditReq;
import com.pants.mall.dto.AfterSaleCreateReq;
import com.pants.mall.dto.AfterSaleQueryReq;
import com.pants.mall.dto.PageResp;

import java.util.Map;

public interface AfterSaleService {

    Long createAfterSale(Long orderId, AfterSaleCreateReq req);

    Map<String, Object> getMyAfterSaleByOrderId(Long orderId);

    PageResp<Map<String, Object>> adminListAfterSales(AfterSaleQueryReq req);

    Map<String, Object> adminGetAfterSaleDetail(Long id);

    void adminAudit(Long id, AfterSaleAuditReq req);

    /**
     * 用户确认已退货（仅退货退款）
     */
    void userMarkReturned(Long orderId);

    /**
     * 管理员确认收货并退款（仅退货退款）
     */
    void adminReceiveAndRefund(Long id);
}