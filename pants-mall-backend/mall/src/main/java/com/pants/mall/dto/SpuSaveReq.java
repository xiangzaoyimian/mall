package com.pants.mall.dto;

import lombok.Data;

import java.util.List;

@Data
public class SpuSaveReq {
    private String name;
    private Long categoryId;
    private String description;
    private String status;
    private List<SkuSaveReq> skus;
    private String coverUrl;
}
