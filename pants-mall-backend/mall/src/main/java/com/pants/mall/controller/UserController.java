package com.pants.mall.controller;

import com.pants.mall.common.Result;
import com.pants.mall.entity.Address;
import com.pants.mall.service.AddressService;
import com.pants.mall.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserController {
    private final AddressService addressService;
    private final AuthService authService;

    @GetMapping("/addresses")
    public Result<List<Address>> listAddress() {
        return Result.ok(addressService.listMy());
    }

    @PostMapping("/addresses")
    public Result<Void> addAddress(@RequestBody Address address) {
        addressService.save(address);
        return Result.ok(null);
    }

    @PostMapping("/update-password")
    public Result<Void> updatePassword(@RequestBody UpdatePasswordReq req) {
        authService.updatePassword(req.getPassword());
        return Result.ok(null);
    }

    // 内部类，用于接收密码更新请求
    public static class UpdatePasswordReq {
        private String password;

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }
}
