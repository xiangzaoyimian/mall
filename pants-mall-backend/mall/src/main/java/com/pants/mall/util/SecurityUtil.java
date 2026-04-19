package com.pants.mall.util;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.pants.mall.entity.User;
import com.pants.mall.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SecurityUtil {
    private final UserMapper userMapper;

    public Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null) {
            System.out.println("[SecurityUtil] auth is NULL");
            return null;
        }

        Object principal = auth.getPrincipal();
        System.out.println("[SecurityUtil] auth.class=" + auth.getClass().getName());
        System.out.println("[SecurityUtil] principal.class=" + (principal == null ? "null" : principal.getClass().getName()));
        System.out.println("[SecurityUtil] principal=" + principal);
        System.out.println("[SecurityUtil] authorities=" + auth.getAuthorities());

        String username;
        if (principal instanceof UserDetails ud) {
            username = ud.getUsername();
        } else if (principal instanceof String s) {
            username = s;
        } else {
            return null;
        }

        User user = userMapper.selectOne(new QueryWrapper<User>()
                .eq("username", username)
                .eq("deleted", 0)
                .last("limit 1"));

        Long userId = (user == null ? null : user.getId());
        System.out.println("[SecurityUtil] username=" + username + ", userId=" + userId);

        return userId;
    }

    public String getUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null) {
            return null;
        }

        Object principal = auth.getPrincipal();
        if (principal instanceof UserDetails ud) {
            return ud.getUsername();
        } else if (principal instanceof String s) {
            return s;
        } else {
            return null;
        }
    }
}