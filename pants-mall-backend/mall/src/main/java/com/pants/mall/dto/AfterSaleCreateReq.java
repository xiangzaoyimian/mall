package com.pants.mall.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AfterSaleCreateReq {

    /**
     * REFUND / RETURN_REFUND
     */
    @NotBlank(message = "售后类型不能为空")
    private String type;

    /**
     * 申请原因
     */
    @NotBlank(message = "申请原因不能为空")
    @Size(max = 255, message = "申请原因不能超过255个字符")
    private String reason;

    /**
     * 申请说明
     */
    @Size(max = 1000, message = "申请说明不能超过1000个字符")
    private String description;
}