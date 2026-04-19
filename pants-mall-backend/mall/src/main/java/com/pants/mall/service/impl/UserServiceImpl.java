package com.pants.mall.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.pants.mall.common.BusinessException;
import com.pants.mall.dto.MeBodyUpdateReq;
import com.pants.mall.entity.User;
import com.pants.mall.mapper.UserMapper;
import com.pants.mall.service.UserService;
import com.pants.mall.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserMapper userMapper;
    private final SecurityUtil securityUtil;

    @Override
    public User getByUsername(String username) {
        if (username == null || username.isBlank()) return null;
        return userMapper.selectOne(new QueryWrapper<User>()
                .eq("username", username)
                .eq("deleted", 0)
                .last("limit 1"));
    }

    @Override
    public Map<String, Object> getMe() {
        Long userId = securityUtil.currentUserId();
        if (userId == null) throw new BusinessException("未登录");

        User u = userMapper.selectById(userId);
        if (u == null || (u.getDeleted() != null && u.getDeleted() != 0)) {
            throw new BusinessException("用户不存在");
        }

        Map<String, Object> m = new HashMap<>();
        m.put("id", u.getId());
        m.put("username", u.getUsername());
        m.put("nickname", u.getNickname());
        m.put("role", u.getRole());
        m.put("status", u.getStatus());
        m.put("heightCm", u.getHeightCm());
        m.put("waistCm", u.getWaistCm());
        m.put("legLengthCm", u.getLegLengthCm());
        return m;
    }

    @Override
    public User getMeUser() {
        Long userId = securityUtil.currentUserId();
        if (userId == null) throw new BusinessException("未登录");

        User u = userMapper.selectById(userId);
        if (u == null || (u.getDeleted() != null && u.getDeleted() != 0)) {
            throw new BusinessException("用户不存在");
        }
        return u;
    }

    @Override
    @Transactional
    public void updateBody(MeBodyUpdateReq req) {
        Long userId = securityUtil.currentUserId();
        if (userId == null) throw new BusinessException("未登录");

        if (req == null) throw new BusinessException("body 不能为空");

        Integer height = req.getHeightCm();
        Integer waist = req.getWaistCm();
        Integer leg = req.getLegLengthCm();

        if (height != null && (height < 100 || height > 250)) {
            throw new BusinessException("身高范围不合法");
        }
        if (waist != null && (waist < 40 || waist > 200)) {
            throw new BusinessException("腰围范围不合法");
        }
        if (leg != null && (leg < 40 || leg > 180)) {
            throw new BusinessException("腿长范围不合法");
        }

        int rows = userMapper.updateBody(userId, height, waist, leg);
        if (rows != 1) {
            throw new BusinessException("更新失败");
        }
    }

    @Override
    @Transactional
    public void updateNickname(String nickname) {
        Long userId = securityUtil.currentUserId();
        if (userId == null) {
            throw new BusinessException("未登录");
        }

        String newNickname = nickname == null ? "" : nickname.trim();
        if (newNickname.isEmpty()) {
            throw new BusinessException("昵称不能为空");
        }
        if (newNickname.length() < 2 || newNickname.length() > 20) {
            throw new BusinessException("昵称长度需在2到20个字符之间");
        }

        int rows = userMapper.updateNickname(userId, newNickname);
        if (rows != 1) {
            throw new BusinessException("修改昵称失败");
        }
    }

    @Override
    @Transactional
    public void updateAdmin(User user) {
        Long userId = securityUtil.currentUserId();
        if (userId == null) throw new BusinessException("未登录");

        if (user == null) throw new BusinessException("用户信息不能为空");

        User existingUser = userMapper.selectById(userId);
        if (existingUser == null || (existingUser.getDeleted() != null && existingUser.getDeleted() != 0)) {
            throw new BusinessException("用户不存在");
        }

        if (user.getNickname() != null) {
            String nickname = user.getNickname().trim();
            if (nickname.isEmpty()) {
                throw new BusinessException("昵称不能为空");
            }
            if (nickname.length() < 2 || nickname.length() > 20) {
                throw new BusinessException("昵称长度需在2到20个字符之间");
            }
            existingUser.setNickname(nickname);
        }

        if (user.getPassword() != null && !user.getPassword().isEmpty()) {
            // 密码加密逻辑（如果需要）
            existingUser.setPassword(user.getPassword());
        }

        userMapper.updateById(existingUser);
    }

    @Override
    public Map<String, Object> listUsers(Integer page, Integer size) {
        if (page == null || page < 1) page = 1;
        if (size == null || size < 1 || size > 100) size = 10;

        Page<User> userPage = new Page<>(page, size);
        Page<User> resultPage = userMapper.selectPage(userPage, new QueryWrapper<User>()
                .eq("deleted", 0)
                .orderByDesc("created_at"));

        Map<String, Object> result = new HashMap<>();
        result.put("list", resultPage.getRecords());
        result.put("total", resultPage.getTotal());
        result.put("page", page);
        result.put("size", size);
        return result;
    }

    @Override
    @Transactional
    public void updateUser(Long id, User user) {
        if (id == null) throw new BusinessException("用户ID不能为空");
        if (user == null) throw new BusinessException("用户信息不能为空");

        User existingUser = userMapper.selectById(id);
        if (existingUser == null || (existingUser.getDeleted() != null && existingUser.getDeleted() != 0)) {
            throw new BusinessException("用户不存在");
        }

        if (user.getNickname() != null) {
            String nickname = user.getNickname().trim();
            if (nickname.isEmpty()) {
                throw new BusinessException("昵称不能为空");
            }
            if (nickname.length() < 2 || nickname.length() > 20) {
                throw new BusinessException("昵称长度需在2到20个字符之间");
            }
            existingUser.setNickname(nickname);
        }

        if (user.getRole() != null) {
            existingUser.setRole(user.getRole());
        }

        if (user.getStatus() != null) {
            existingUser.setStatus(user.getStatus());
        }

        if (user.getPassword() != null && !user.getPassword().isEmpty()) {
            // 密码加密逻辑（如果需要）
            existingUser.setPassword(user.getPassword());
        }

        userMapper.updateById(existingUser);
    }

    @Override
    @Transactional
    public void deleteUser(Long id) {
        if (id == null) throw new BusinessException("用户ID不能为空");

        User existingUser = userMapper.selectById(id);
        if (existingUser == null || (existingUser.getDeleted() != null && existingUser.getDeleted() != 0)) {
            throw new BusinessException("用户不存在");
        }

        // 软删除
        existingUser.setDeleted(1);
        userMapper.updateById(existingUser);
    }
}