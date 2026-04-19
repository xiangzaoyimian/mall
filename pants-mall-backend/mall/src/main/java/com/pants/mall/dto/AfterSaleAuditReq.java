package com.pants.mall.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AfterSaleAuditReq {

    /**
     * APPROVED / REJECTED
     */
    @NotBlank(message = "审核状态不能为空")
    private String status;

    @Size(max = 500, message = "审核备注不能超过500个字符")
    private String adminRemark;
}