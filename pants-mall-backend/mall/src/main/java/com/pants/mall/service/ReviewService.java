package com.pants.mall.service;

import com.pants.mall.dto.ReviewCreateReq;
import com.pants.mall.dto.ReviewItemResp;

import java.util.List;

public interface ReviewService {

    void createReview(ReviewCreateReq req);

    List<ReviewItemResp> listBySpuId(Long spuId);
}