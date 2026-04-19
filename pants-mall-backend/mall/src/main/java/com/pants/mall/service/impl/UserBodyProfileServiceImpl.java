package com.pants.mall.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.pants.mall.common.BusinessException;
import com.pants.mall.entity.UserBodyProfile;
import com.pants.mall.mapper.UserBodyProfileMapper;
import com.pants.mall.service.UserBodyProfileService;
import com.pants.mall.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserBodyProfileServiceImpl implements UserBodyProfileService {

    private final UserBodyProfileMapper mapper;
    private final SecurityUtil securityUtil;

    @Override
    public void add(UserBodyProfile profile) {
        Long userId = securityUtil.currentUserId();
        if (userId == null) throw new BusinessException("未登录");
        if (profile == null) throw new BusinessException("参数不能为空");

        profile.setUserId(userId);
        profile.setCreatedAt(LocalDateTime.now());
        profile.setUpdatedAt(LocalDateTime.now());
        profile.setDeleted(0);

        mapper.insert(profile);
    }

    @Override
    public void update(UserBodyProfile profile) {
        Long userId = securityUtil.currentUserId();
        if (userId == null) throw new BusinessException("未登录");
        if (profile == null || profile.getId() == null) {
            throw new BusinessException("档案ID不能为空");
        }

        UserBodyProfile db = mapper.selectOne(
                new QueryWrapper<UserBodyProfile>()
                        .eq("id", profile.getId())
                        .eq("user_id", userId)
                        .eq("deleted", 0)
                        .last("limit 1")
        );

        if (db == null) {
            throw new BusinessException("数据不存在");
        }

        UserBodyProfile update = new UserBodyProfile();
        update.setId(db.getId());
        update.setName(profile.getName());
        update.setHeightCm(profile.getHeightCm());
        update.setWeightKg(profile.getWeightKg());
        update.setWaistCm(profile.getWaistCm());
        update.setLegLengthCm(profile.getLegLengthCm());
        update.setUpdatedAt(LocalDateTime.now());

        int rows = mapper.updateById(update);
        if (rows != 1) {
            throw new BusinessException("更新失败");
        }
    }

    @Override
    public void delete(Long id) {
        Long userId = securityUtil.currentUserId();
        if (userId == null) throw new BusinessException("未登录");
        if (id == null) throw new BusinessException("档案ID不能为空");

        UserBodyProfile db = mapper.selectOne(
                new QueryWrapper<UserBodyProfile>()
                        .eq("id", id)
                        .eq("user_id", userId)
                        .eq("deleted", 0)
                        .last("limit 1")
        );

        if (db == null) {
            throw new BusinessException("数据不存在");
        }

        int rows = mapper.update(
                null,
                new UpdateWrapper<UserBodyProfile>()
                        .eq("id", id)
                        .eq("user_id", userId)
                        .eq("deleted", 0)
                        .set("deleted", 1)
                        .set("updated_at", LocalDateTime.now())
        );

        if (rows != 1) {
            throw new BusinessException("删除失败");
        }
    }

    @Override
    public List<UserBodyProfile> list() {
        Long userId = securityUtil.currentUserId();
        if (userId == null) throw new BusinessException("未登录");

        return mapper.selectList(
                new QueryWrapper<UserBodyProfile>()
                        .eq("user_id", userId)
                        .eq("deleted", 0)
                        .orderByDesc("id")
        );
    }

    @Override
    public UserBodyProfile getByIdForAdmin(Long id) {
        if (id == null) {
            throw new BusinessException("档案ID不能为空");
        }

        UserBodyProfile profile = mapper.selectOne(
                new QueryWrapper<UserBodyProfile>()
                        .eq("id", id)
                        .eq("deleted", 0)
                        .last("limit 1")
        );

        if (profile == null) {
            throw new BusinessException("档案不存在");
        }

        return profile;
    }
}