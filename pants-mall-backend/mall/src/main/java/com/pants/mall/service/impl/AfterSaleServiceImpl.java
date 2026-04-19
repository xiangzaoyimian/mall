package com.pants.mall.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.pants.mall.common.AfterSaleStatus;
import com.pants.mall.common.AfterSaleType;
import com.pants.mall.common.BusinessException;
import com.pants.mall.common.OrderStatus;
import com.pants.mall.dto.AfterSaleAuditReq;
import com.pants.mall.dto.AfterSaleCreateReq;
import com.pants.mall.dto.AfterSaleQueryReq;
import com.pants.mall.dto.PageResp;
import com.pants.mall.entity.AfterSale;
import com.pants.mall.entity.OrderInfo;
import com.pants.mall.mapper.AfterSaleMapper;
import com.pants.mall.mapper.OrderInfoMapper;
import com.pants.mall.service.AfterSaleService;
import com.pants.mall.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AfterSaleServiceImpl implements AfterSaleService {

    private final AfterSaleMapper afterSaleMapper;
    private final OrderInfoMapper orderInfoMapper;
    private final SecurityUtil securityUtil;

    @Override
    @Transactional
    public Long createAfterSale(Long orderId, AfterSaleCreateReq req) {
        Long userId = securityUtil.currentUserId();
        if (userId == null) {
            throw new BusinessException("未登录");
        }
        if (orderId == null) {
            throw new BusinessException("订单ID不能为空");
        }
        if (req == null) {
            throw new BusinessException("请求参数不能为空");
        }

        String type = safeUpper(req.getType());
        String reason = safeTrim(req.getReason());
        String description = safeTrim(req.getDescription());

        validateCreateParams(type, reason, description);

        OrderInfo order = getValidOrder(orderId);

        if (!userId.equals(order.getUserId())) {
            throw new BusinessException("无权限申请该订单售后");
        }

        validateCreateRule(order, type);
        checkDuplicateAfterSale(orderId);

        AfterSale afterSale = new AfterSale();
        afterSale.setOrderId(order.getId());
        afterSale.setOrderNo(order.getOrderNo());
        afterSale.setUserId(userId);
        afterSale.setType(type);
        afterSale.setReason(reason);
        afterSale.setDescription(description.isEmpty() ? null : description);
        afterSale.setStatus(AfterSaleStatus.PENDING);
        afterSale.setAdminRemark(null);

        afterSaleMapper.insert(afterSale);
        return afterSale.getId();
    }

    @Override
    public Map<String, Object> getMyAfterSaleByOrderId(Long orderId) {
        Long userId = securityUtil.currentUserId();
        if (userId == null) {
            throw new BusinessException("未登录");
        }
        if (orderId == null) {
            throw new BusinessException("订单ID不能为空");
        }

        OrderInfo order = getValidOrder(orderId);
        if (!userId.equals(order.getUserId())) {
            throw new BusinessException("无权限查看该订单售后");
        }

        AfterSale afterSale = findByOrderId(orderId);
        if (afterSale == null) {
            return null;
        }
        return buildAfterSaleMap(afterSale);
    }

    @Override
    public PageResp<Map<String, Object>> adminListAfterSales(AfterSaleQueryReq req) {
        int pageNo = (req == null || req.getPage() == null || req.getPage() <= 0) ? 1 : req.getPage();
        int pageSize = (req == null || req.getSize() == null || req.getSize() <= 0) ? 10 : req.getSize();
        if (pageSize > 50) {
            pageSize = 50;
        }

        Page<AfterSale> page = new Page<>(pageNo, pageSize);
        QueryWrapper<AfterSale> qw = new QueryWrapper<AfterSale>()
                .eq("deleted", 0);

        if (req != null && req.getStatus() != null && !req.getStatus().isBlank()) {
            qw.eq("status", req.getStatus().trim().toUpperCase());
        }
        if (req != null && req.getType() != null && !req.getType().isBlank()) {
            qw.eq("type", req.getType().trim().toUpperCase());
        }
        if (req != null && req.getOrderNo() != null && !req.getOrderNo().isBlank()) {
            qw.like("order_no", req.getOrderNo().trim());
        }

        qw.orderByDesc("created_at");
        afterSaleMapper.selectPage(page, qw);

        return PageResp.of(
                page.getTotal(),
                pageNo,
                pageSize,
                page.getRecords().stream().map(this::buildAfterSaleMap).toList()
        );
    }

    @Override
    public Map<String, Object> adminGetAfterSaleDetail(Long id) {
        AfterSale afterSale = getValidAfterSale(id);
        return buildAfterSaleMap(afterSale);
    }

    @Override
    @Transactional
    public void adminAudit(Long id, AfterSaleAuditReq req) {
        if (req == null) {
            throw new BusinessException("请求参数不能为空");
        }

        String auditStatus = safeUpper(req.getStatus());
        String adminRemark = safeTrim(req.getAdminRemark());

        if (!AfterSaleStatus.APPROVED.equals(auditStatus)
                && !AfterSaleStatus.REJECTED.equals(auditStatus)) {
            throw new BusinessException("审核状态不合法");
        }

        if (AfterSaleStatus.REJECTED.equals(auditStatus) && adminRemark.isEmpty()) {
            throw new BusinessException("拒绝售后时请填写审核备注");
        }

        AfterSale afterSale = getValidAfterSale(id);
        checkCanAudit(afterSale);

        OrderInfo order = getValidOrder(afterSale.getOrderId());

        afterSale.setAdminRemark(adminRemark.isEmpty() ? null : adminRemark);

        if (AfterSaleStatus.REJECTED.equals(auditStatus)) {
            afterSale.setStatus(AfterSaleStatus.REJECTED);
            afterSaleMapper.updateById(afterSale);
            return;
        }

        if (AfterSaleType.REFUND.equals(afterSale.getType())) {
            handleRefundApproved(afterSale, order);
            return;
        }

        if (AfterSaleType.RETURN_REFUND.equals(afterSale.getType())) {
            handleReturnRefundApproved(afterSale);
            return;
        }

        throw new BusinessException("未知售后类型，无法审核处理");
    }

    @Override
    @Transactional
    public void userMarkReturned(Long orderId) {
        Long userId = securityUtil.currentUserId();
        if (userId == null) {
            throw new BusinessException("未登录");
        }
        if (orderId == null) {
            throw new BusinessException("订单ID不能为空");
        }

        OrderInfo order = getValidOrder(orderId);
        if (!userId.equals(order.getUserId())) {
            throw new BusinessException("无权限操作该订单售后");
        }

        AfterSale afterSale = findByOrderId(orderId);
        if (afterSale == null) {
            throw new BusinessException("售后申请不存在");
        }

        checkCanUserReturn(afterSale);

        afterSale.setStatus(AfterSaleStatus.RETURNED);
        afterSaleMapper.updateById(afterSale);
    }

    @Override
    @Transactional
    public void adminReceiveAndRefund(Long id) {
        AfterSale afterSale = getValidAfterSale(id);
        checkCanReceiveRefund(afterSale);

        OrderInfo order = getValidOrder(afterSale.getOrderId());

        afterSale.setStatus(AfterSaleStatus.COMPLETED);
        afterSaleMapper.updateById(afterSale);

        order.setStatus(OrderStatus.REFUNDED);
        orderInfoMapper.updateById(order);
    }

    private void validateCreateParams(String type, String reason, String description) {
        if (type.isEmpty()) {
            throw new BusinessException("售后类型不能为空");
        }
        if (!AfterSaleType.REFUND.equals(type) && !AfterSaleType.RETURN_REFUND.equals(type)) {
            throw new BusinessException("售后类型不合法");
        }

        if (reason.isEmpty()) {
            throw new BusinessException("申请原因不能为空");
        }
        if (reason.length() < 2) {
            throw new BusinessException("申请原因至少填写2个字符");
        }
        if (reason.length() > 255) {
            throw new BusinessException("申请原因不能超过255个字符");
        }
        if (description.length() > 1000) {
            throw new BusinessException("申请说明不能超过1000个字符");
        }
    }

    private void validateCreateRule(OrderInfo order, String type) {
        String status = order.getStatus();

        if (OrderStatus.REFUNDED.equals(status)) {
            throw new BusinessException("该订单已退款，不能重复申请售后");
        }
        if (OrderStatus.CANCELED.equals(status) || OrderStatus.CREATED.equals(status)) {
            throw new BusinessException("当前订单状态不支持申请售后");
        }

        if (OrderStatus.PAID.equals(status)) {
            if (!AfterSaleType.REFUND.equals(type)) {
                throw new BusinessException("已支付未发货订单仅支持申请退款");
            }
            return;
        }

        if (OrderStatus.SHIPPED.equals(status) || OrderStatus.FINISHED.equals(status)) {
            if (!AfterSaleType.RETURN_REFUND.equals(type)) {
                throw new BusinessException("已发货或已完成订单仅支持申请退货退款");
            }
            return;
        }

        throw new BusinessException("当前订单状态不支持申请售后: " + status);
    }

    private void checkDuplicateAfterSale(Long orderId) {
        AfterSale existed = findByOrderId(orderId);
        if (existed != null) {
            throw new BusinessException("该订单已提交售后申请，请勿重复提交");
        }
    }

    private void checkCanAudit(AfterSale afterSale) {
        if (!AfterSaleStatus.PENDING.equals(afterSale.getStatus())) {
            throw new BusinessException("当前售后申请已处理，不能重复审核");
        }
    }

    private void checkCanUserReturn(AfterSale afterSale) {
        if (!AfterSaleType.RETURN_REFUND.equals(afterSale.getType())) {
            throw new BusinessException("当前售后类型不支持退货操作");
        }
        if (!AfterSaleStatus.APPROVED.equals(afterSale.getStatus())) {
            throw new BusinessException("当前售后状态不可标记为已退货");
        }
    }

    private void checkCanReceiveRefund(AfterSale afterSale) {
        if (!AfterSaleType.RETURN_REFUND.equals(afterSale.getType())) {
            throw new BusinessException("仅退货退款申请支持确认收货并退款");
        }
        if (!AfterSaleStatus.RETURNED.equals(afterSale.getStatus())) {
            throw new BusinessException("当前售后状态不可确认收货并退款");
        }
    }

    private void handleRefundApproved(AfterSale afterSale, OrderInfo order) {
        afterSale.setStatus(AfterSaleStatus.COMPLETED);
        afterSaleMapper.updateById(afterSale);

        order.setStatus(OrderStatus.REFUNDED);
        orderInfoMapper.updateById(order);
    }

    private void handleReturnRefundApproved(AfterSale afterSale) {
        afterSale.setStatus(AfterSaleStatus.APPROVED);
        afterSaleMapper.updateById(afterSale);
    }

    private OrderInfo getValidOrder(Long orderId) {
        if (orderId == null) {
            throw new BusinessException("订单ID不能为空");
        }

        OrderInfo order = orderInfoMapper.selectById(orderId);
        if (order == null || order.getDeleted() != 0) {
            throw new BusinessException("订单不存在");
        }
        return order;
    }

    private AfterSale getValidAfterSale(Long id) {
        if (id == null) {
            throw new BusinessException("售后ID不能为空");
        }

        AfterSale afterSale = afterSaleMapper.selectById(id);
        if (afterSale == null || afterSale.getDeleted() != 0) {
            throw new BusinessException("售后申请不存在");
        }
        return afterSale;
    }

    private AfterSale findByOrderId(Long orderId) {
        return afterSaleMapper.selectOne(
                new QueryWrapper<AfterSale>()
                        .eq("order_id", orderId)
                        .eq("deleted", 0)
                        .last("limit 1")
        );
    }

    private String safeTrim(String value) {
        return value == null ? "" : value.trim();
    }

    private String safeUpper(String value) {
        return safeTrim(value).toUpperCase();
    }

    private Map<String, Object> buildAfterSaleMap(AfterSale a) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", a.getId() == null ? null : String.valueOf(a.getId()));
        m.put("orderId", a.getOrderId() == null ? null : String.valueOf(a.getOrderId()));
        m.put("orderNo", a.getOrderNo());
        m.put("userId", a.getUserId() == null ? null : String.valueOf(a.getUserId()));
        m.put("type", a.getType());
        m.put("reason", a.getReason());
        m.put("description", a.getDescription());
        m.put("status", a.getStatus());
        m.put("adminRemark", a.getAdminRemark());
        m.put("createdAt", a.getCreatedAt());
        m.put("updatedAt", a.getUpdatedAt());
        return m;
    }
}