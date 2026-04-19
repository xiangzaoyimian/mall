package com.pants.mall.service;

import com.pants.mall.dto.RecommendItemResp;

import java.util.List;

public interface RecommendService {

    List<RecommendItemResp> recommendByProfile(Long profileId);
}