package com.pants.mall.config;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.pants.mall.entity.User;
import com.pants.mall.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AdminPasswordFixRunner implements ApplicationRunner {

    private final UserMapper userMapper;
    private final BCryptPasswordEncoder encoder;

    @Override
    public void run(ApplicationArguments args) {
        User admin = userMapper.selectOne(new QueryWrapper<User>()
                .eq("username", "admin")
                .eq("deleted", 0)
                .last("limit 1"));

        if (admin == null) {
            return;
        }

        if (!encoder.matches("123456", admin.getPassword())) {
            admin.setPassword(encoder.encode("123456"));
            userMapper.updateById(admin);
        }
    }
}
