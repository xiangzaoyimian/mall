package com.pants.mall.service;

import com.pants.mall.dto.MeBodyUpdateReq;
import com.pants.mall.entity.User;

import java.util.Map;

public interface UserService {
    User getByUsername(String username);

    // 当前登录用户信息
    Map<String, Object> getMe();
    
    // 获取当前登录用户实体
    User getMeUser();

    // 更新当前登录用户身体数据
    void updateBody(MeBodyUpdateReq req);

    // 修改当前登录用户昵称
    void updateNickname(String nickname);
    
    // 更新管理员信息
    void updateAdmin(User user);
    
    // 获取用户列表（带分页）
    Map<String, Object> listUsers(Integer page, Integer size);
    
    // 更新用户信息
    void updateUser(Long id, User user);
    
    // 删除用户
    void deleteUser(Long id);
}