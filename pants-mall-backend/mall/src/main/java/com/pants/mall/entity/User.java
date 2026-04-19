package com.pants.mall.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@TableName("`user`")
@EqualsAndHashCode(callSuper = true)
public class User extends BaseEntity {
    private Long id;
    private String username;
    private String password;
    private String role;
    private String status;
    private String nickname;
    private Integer heightCm;
    private Integer waistCm;
    private Integer legLengthCm;
}
