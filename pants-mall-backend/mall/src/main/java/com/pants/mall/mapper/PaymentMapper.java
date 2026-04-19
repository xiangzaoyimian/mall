package com.pants.mall.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pants.mall.entity.Payment;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface PaymentMapper extends BaseMapper<Payment> {
}
