package com.pants.mall.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.pants.mall.common.BusinessException;
import com.pants.mall.entity.Address;
import com.pants.mall.mapper.AddressMapper;
import com.pants.mall.service.AddressService;
import com.pants.mall.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AddressServiceImpl implements AddressService {

    private final AddressMapper addressMapper;
    private final SecurityUtil securityUtil;

    @Override
    public List<Address> listMy() {
        Long userId = securityUtil.currentUserId();
        if (userId == null) {
            throw new BusinessException("未登录");
        }

        return addressMapper.selectList(
                new QueryWrapper<Address>()
                        .eq("user_id", userId)
                        .eq("deleted", 0)
                        .orderByDesc("is_default")
                        .orderByDesc("updated_at")
                        .orderByDesc("id")
        );
    }

    @Override
    public void save(Address address) {
        Long userId = securityUtil.currentUserId();
        if (userId == null) {
            throw new BusinessException("未登录");
        }
        if (address == null) {
            throw new BusinessException("地址参数不能为空");
        }

        validateAddress(address);

        address.setUserId(userId);

        Integer isDefault = address.getIsDefault();
        if (isDefault == null) {
            address.setIsDefault(0);
            isDefault = 0;
        }

        if (isDefault == 1) {
            clearDefault(userId);
        }

        addressMapper.insert(address);
    }

    @Override
    public void delete(Long id) {
        Long userId = securityUtil.currentUserId();
        if (userId == null) {
            throw new BusinessException("未登录");
        }
        if (id == null) {
            throw new BusinessException("地址ID不能为空");
        }

        Address old = addressMapper.selectById(id);
        if (old == null || old.getDeleted() != 0) {
            throw new BusinessException("地址不存在");
        }
        if (!userId.equals(old.getUserId())) {
            throw new BusinessException("无权限删除该地址");
        }

        addressMapper.deleteById(id);
    }

    @Override
    public void setDefault(Long id) {
        Long userId = securityUtil.currentUserId();
        if (userId == null) {
            throw new BusinessException("未登录");
        }
        if (id == null) {
            throw new BusinessException("地址ID不能为空");
        }

        Address old = addressMapper.selectById(id);
        if (old == null || old.getDeleted() != 0) {
            throw new BusinessException("地址不存在");
        }
        if (!userId.equals(old.getUserId())) {
            throw new BusinessException("无权限设置该地址");
        }

        clearDefault(userId);

        Address update = new Address();
        update.setId(id);
        update.setIsDefault(1);
        addressMapper.updateById(update);
    }

    private void clearDefault(Long userId) {
        addressMapper.update(
                null,
                new UpdateWrapper<Address>()
                        .eq("user_id", userId)
                        .eq("deleted", 0)
                        .set("is_default", 0)
        );
    }

    private void validateAddress(Address address) {
        if (!StringUtils.hasText(address.getReceiver())) {
            throw new BusinessException("收货人不能为空");
        }
        if (!StringUtils.hasText(address.getPhone())) {
            throw new BusinessException("手机号不能为空");
        }
        if (!StringUtils.hasText(address.getProvince())) {
            throw new BusinessException("省不能为空");
        }
        if (!StringUtils.hasText(address.getCity())) {
            throw new BusinessException("市不能为空");
        }
        if (!StringUtils.hasText(address.getDistrict())) {
            throw new BusinessException("区不能为空");
        }
        if (!StringUtils.hasText(address.getDetail())) {
            throw new BusinessException("详细地址不能为空");
        }

        address.setReceiver(address.getReceiver().trim());
        address.setPhone(address.getPhone().trim());
        address.setProvince(address.getProvince().trim());
        address.setCity(address.getCity().trim());
        address.setDistrict(address.getDistrict().trim());
        address.setDetail(address.getDetail().trim());

        if (address.getIsDefault() == null) {
            address.setIsDefault(0);
        }
    }
}