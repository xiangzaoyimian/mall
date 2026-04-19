package com.pants.mall.controller;

import com.pants.mall.common.Result;
import com.pants.mall.dto.AiChatReq;
import com.pants.mall.dto.AiChatResp;
import com.pants.mall.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @PostMapping("/chat")
    public Result<AiChatResp> chat(@RequestBody AiChatReq req) {
        return Result.ok(aiService.chat(req));
    }
}