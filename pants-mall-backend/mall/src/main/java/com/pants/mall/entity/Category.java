package com.pants.mall.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@TableName("category")
@EqualsAndHashCode(callSuper = true)
public class Category extends BaseEntity {
    private Long id;
    private String name;
    private Long parentId;
    private Integer sort;
    private String status;
}
