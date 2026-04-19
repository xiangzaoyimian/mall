package com.pants.mall.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class ProductListResp {
    private long total;
    private List<ProductItemResp> list;
}
