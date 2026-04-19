package com.pants.mall.controller;

import com.pants.mall.common.Result;
import com.pants.mall.entity.Address;
import com.pants.mall.service.AddressService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/address")
@RequiredArgsConstructor
public class AddressController {

    private final AddressService addressService;

    @GetMapping("/list")
    public Result<List<Map<String, Object>>> listMy() {
        List<Address> list = addressService.listMy();

        List<Map<String, Object>> result = list.stream().map(address -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", address.getId() == null ? null : String.valueOf(address.getId()));
            map.put("userId", address.getUserId() == null ? null : String.valueOf(address.getUserId()));
            map.put("receiver", address.getReceiver());
            map.put("phone", address.getPhone());
            map.put("province", address.getProvince());
            map.put("city", address.getCity());
            map.put("district", address.getDistrict());
            map.put("detail", address.getDetail());
            map.put("isDefault", address.getIsDefault());
            map.put("createdAt", address.getCreatedAt());
            map.put("updatedAt", address.getUpdatedAt());
            map.put("deleted", address.getDeleted());
            return map;
        }).toList();

        return Result.ok(result);
    }

    @PostMapping("/save")
    public Result<Void> save(@RequestBody Address address) {
        addressService.save(address);
        return Result.ok(null);
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable("id") Long id) {
        addressService.delete(id);
        return Result.ok(null);
    }

    @PutMapping("/{id}/default")
    public Result<Void> setDefault(@PathVariable("id") Long id) {
        addressService.setDefault(id);
        return Result.ok(null);
    }
}