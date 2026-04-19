package com.pants.mall.controller;

import com.pants.mall.common.Result;
import com.pants.mall.entity.UserBodyProfile;
import com.pants.mall.service.UserBodyProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/body-profile")
@RequiredArgsConstructor
public class AdminBodyProfileController {

    private final UserBodyProfileService userBodyProfileService;

    @GetMapping("/{id}")
    public Result<UserBodyProfile> detail(@PathVariable("id") Long id) {
        return Result.ok(userBodyProfileService.getByIdForAdmin(id));
    }
}