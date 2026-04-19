package com.pants.mall.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@TableName("favorite")
@EqualsAndHashCode(callSuper = true)
public class Favorite extends BaseEntity {
    private Long id;
    private Long userId;
    private Long spuId;
}
