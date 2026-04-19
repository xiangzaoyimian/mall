package com.pants.mall.service;

import com.pants.mall.dto.AuthLoginReq;
import com.pants.mall.dto.AuthLoginResp;
import com.pants.mall.dto.AuthRegisterReq;

public interface AuthService {
    AuthLoginResp login(AuthLoginReq req);
    void register(AuthRegisterReq req);
    void updatePassword(String password);
}
