package com.pants.mall.dto;

import lombok.Data;

@Data
public class AfterSaleQueryReq {
    private Integer page;
    private Integer size;
    private String status;
    private String type;
    private String orderNo;
}