package com.pants.mall.controller;

import com.pants.mall.common.Result;
import com.pants.mall.entity.User;
import com.pants.mall.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/users")
@RequiredArgsConstructor
public class AdminUserController {
    
    private final UserService userService;
    
    // 获取当前管理员信息
    @GetMapping("/me")
    public Result<User> getCurrentAdmin() {
        return Result.ok(userService.getMeUser());
    }
    
    // 更新当前管理员信息
    @PutMapping("/me")
    public Result<Void> updateCurrentAdmin(@RequestBody User user) {
        userService.updateAdmin(user);
        return Result.ok(null);
    }
    
    // 获取用户列表
    @GetMapping
    public Result<Map<String, Object>> listUsers(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        return Result.ok(userService.listUsers(page, size));
    }
    
    // 更新用户信息
    @PutMapping("/{id}")
    public Result<Void> updateUser(@PathVariable Long id, @RequestBody User user) {
        userService.updateUser(id, user);
        return Result.ok(null);
    }
    
    // 删除用户
    @DeleteMapping("/{id}")
    public Result<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return Result.ok(null);
    }
}