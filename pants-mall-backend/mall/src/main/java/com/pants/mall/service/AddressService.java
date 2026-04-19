package com.pants.mall.service;

import com.pants.mall.entity.Address;

import java.util.List;

public interface AddressService {
    List<Address> listMy();
    void save(Address address);
    void delete(Long id);
    void setDefault(Long id);
}