package com.pants.mall.controller;

import com.pants.mall.common.Result;
import com.pants.mall.dto.RecommendItemResp;
import com.pants.mall.service.RecommendService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/recommend/pants")
@RequiredArgsConstructor
public class RecommendController {

    private final RecommendService recommendService;

    @GetMapping("/by-profile")
    public Result<List<RecommendItemResp>> byProfile(@RequestParam("profileId") Long profileId) {
        return Result.ok(recommendService.recommendByProfile(profileId));
    }
}