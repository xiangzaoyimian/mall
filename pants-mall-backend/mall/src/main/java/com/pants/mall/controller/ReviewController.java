package com.pants.mall.controller;

import com.pants.mall.common.Result;
import com.pants.mall.dto.ReviewCreateReq;
import com.pants.mall.dto.ReviewItemResp;
import com.pants.mall.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/review")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping("/create")
    public Result<String> create(@RequestBody ReviewCreateReq req) {
        reviewService.createReview(req);
        return Result.ok("评价提交成功");
    }

    @GetMapping("/list")
    public Result<List<ReviewItemResp>> list(@RequestParam("spuId") Long spuId) {
        return Result.ok(reviewService.listBySpuId(spuId));
    }
}