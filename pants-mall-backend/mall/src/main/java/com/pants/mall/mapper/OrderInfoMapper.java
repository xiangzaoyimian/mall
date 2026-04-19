package com.pants.mall.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pants.mall.entity.OrderInfo;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface OrderInfoMapper extends BaseMapper<OrderInfo> {
}
