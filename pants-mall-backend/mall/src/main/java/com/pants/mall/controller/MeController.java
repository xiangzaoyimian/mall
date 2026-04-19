package com.pants.mall.controller;

import com.pants.mall.common.Result;
import com.pants.mall.dto.MeBodyUpdateReq;
import com.pants.mall.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/me")
@RequiredArgsConstructor
public class MeController {

    private final UserService userService;

    // 获取当前登录用户信息（含身体数据）
    @GetMapping
    public Result<Map<String, Object>> me() {
        return Result.ok(userService.getMe());
    }

    // 更新身体数据（给推荐功能用）
    @PostMapping("/body")
    public Result<Void> updateBody(@RequestBody MeBodyUpdateReq req) {
        userService.updateBody(req);
        return Result.ok(null);
    }

    // 修改当前昵称
    @PutMapping("/nickname")
    public Result<Void> updateNickname(@RequestBody Map<String, String> body) {
        String nickname = body == null ? null : body.get("nickname");
        userService.updateNickname(nickname);
        return Result.ok(null);
    }
}