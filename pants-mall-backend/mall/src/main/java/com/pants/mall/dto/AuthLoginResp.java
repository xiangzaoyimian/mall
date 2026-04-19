package com.pants.mall.dto;

public class AuthLoginResp {
    private String token;

    public AuthLoginResp() {}

    public AuthLoginResp(String token) {
        this.token = token;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
}