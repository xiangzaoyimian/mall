package com.pants.mall.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("user_body_profile")
public class UserBodyProfile {

    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long userId;

    private String name;

    private Integer heightCm;
    private Double weightKg;
    private Integer waistCm;
    private Integer legLengthCm;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private Integer deleted;
}