package com.pants.mall.service;

import com.pants.mall.dto.AdminSpuDetailResp;
import com.pants.mall.dto.ProductCompareResp;
import com.pants.mall.dto.ProductListResp;
import com.pants.mall.dto.ProductQueryReq;
import com.pants.mall.dto.SpuSaveReq;
import com.pants.mall.entity.ProductSpu;

import java.util.List;

public interface ProductService {

    ProductListResp query(ProductQueryReq req);

    ProductListResp adminQuery(ProductQueryReq req);

    ProductSpu getById(Long id);

    AdminSpuDetailResp getAdminDetailById(Long id);

    List<ProductCompareResp> compareBySpuIds(List<Long> spuIds);

    Long createSpu(SpuSaveReq req);

    void updateSpu(Long id, SpuSaveReq req);

    void deleteSpu(Long id);

    void updateStatus(Long id, String status);
}