package com.pants.mall.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.pants.mall.common.BusinessException;
import com.pants.mall.common.Constants;
import com.pants.mall.dto.AuthLoginReq;
import com.pants.mall.dto.AuthLoginResp;
import com.pants.mall.dto.AuthRegisterReq;
import com.pants.mall.entity.User;
import com.pants.mall.mapper.UserMapper;
import com.pants.mall.service.AuthService;
import com.pants.mall.util.JwtUtils;
import com.pants.mall.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserMapper userMapper;
  private final AuthenticationManager authenticationManager;
  private final JwtUtils jwtUtils;
  private final BCryptPasswordEncoder encoder;
  private final SecurityUtil securityUtil;

    @Override
    public AuthLoginResp login(AuthLoginReq req) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword())
        );
        User user = userMapper.selectOne(new QueryWrapper<User>()
                .eq("username", req.getUsername())
                .eq("deleted", 0)
                .last("limit 1"));
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        String token = jwtUtils.generateToken(user.getUsername(), user.getRole());
        return new AuthLoginResp(token);
    }

    @Override
    public void register(AuthRegisterReq req) {
        User exists = userMapper.selectOne(new QueryWrapper<User>()
                .eq("username", req.getUsername())
                .eq("deleted", 0)
                .last("limit 1"));
        if (exists != null) {
            throw new BusinessException("用户名已存在");
        }
        User user = new User();
        user.setUsername(req.getUsername());
        user.setPassword(encoder.encode(req.getPassword()));
        user.setRole(Constants.ROLE_USER);
        user.setStatus(Constants.USER_STATUS_NORMAL);
        userMapper.insert(user);
    }

    @Override
    public void updatePassword(String password) {
        // 获取当前登录用户的用户名
        String username = securityUtil.getUsername();
        if (username == null) {
            throw new BusinessException("用户未登录");
        }
        
        // 查找用户
        User user = userMapper.selectOne(new QueryWrapper<User>()
                .eq("username", username)
                .eq("deleted", 0)
                .last("limit 1"));
        
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        
        // 更新密码
        user.setPassword(encoder.encode(password));
        userMapper.updateById(user);
    }
}
