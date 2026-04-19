package com.pants.mall.controller;

import com.pants.mall.common.Result;
import com.pants.mall.entity.UserBodyProfile;
import com.pants.mall.service.UserBodyProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/body-profile")
@RequiredArgsConstructor
public class UserBodyProfileController {

    private final UserBodyProfileService service;

    @PostMapping
    public Result<Void> add(@RequestBody UserBodyProfile profile) {
        service.add(profile);
        return Result.ok(null);
    }

    @PutMapping
    public Result<Void> update(@RequestBody UserBodyProfile profile) {
        service.update(profile);
        return Result.ok(null);
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable("id") Long id) {
        service.delete(id);
        return Result.ok(null);
    }

    @GetMapping("/list")
    public Result<List<UserBodyProfile>> list() {
        return Result.ok(service.list());
    }
}