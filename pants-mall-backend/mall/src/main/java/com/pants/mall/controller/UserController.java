package com.pants.mall.controller;

import com.pants.mall.common.Result;
import com.pants.mall.entity.Address;
import com.pants.mall.service.AddressService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserController {
    private final AddressService addressService;

    @GetMapping("/addresses")
    public Result<List<Address>> listAddress() {
        return Result.ok(addressService.listMy());
    }

    @PostMapping("/addresses")
    public Result<Void> addAddress(@RequestBody Address address) {
        addressService.save(address);
        return Result.ok(null);
    }
}
