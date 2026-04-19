package com.pants.mall.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pants.mall.entity.CartItem;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface CartItemMapper extends BaseMapper<CartItem> {

    /**
     * 下单成功后，物理删除当前用户购物车中对应 SKU
     * 这里不能再走 MyBatis-Plus 的逻辑删除，否则可能触发
     * uk_cart_user_sku_deleted(user_id, sku_id, deleted) 唯一索引冲突
     */
    @Delete("""
        DELETE FROM cart_item
        WHERE user_id = #{userId}
          AND sku_id = #{skuId}
    """)
    int deleteByUserIdAndSkuIdPhysical(@Param("userId") Long userId, @Param("skuId") Long skuId);
}