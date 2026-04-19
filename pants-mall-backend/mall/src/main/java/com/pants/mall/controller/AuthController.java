package com.pants.mall.controller;

import com.pants.mall.common.Result;
import com.pants.mall.dto.AuthLoginReq;
import com.pants.mall.dto.AuthLoginResp;
import com.pants.mall.dto.AuthRegisterReq;
import com.pants.mall.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public Result<AuthLoginResp> login(@RequestBody @Valid AuthLoginReq req) {
        return Result.ok(authService.login(req));
    }

    @PostMapping("/register")
    public Result<Void> register(@RequestBody @Valid AuthRegisterReq req) {
        authService.register(req);
        return Result.ok(null);
    }
}
