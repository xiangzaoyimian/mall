package com.pants.mall.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pants.mall.entity.Favorite;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface FavoriteMapper extends BaseMapper<Favorite> {

    // 注意：这里用的是手写 SQL，绕开 MyBatis-Plus 的逻辑删除自动条件
    @Select("SELECT id, user_id, spu_id, created_at, updated_at, deleted " +
            "FROM favorite " +
            "WHERE user_id = #{userId} AND spu_id = #{spuId} " +
            "LIMIT 1")
    Favorite selectAnyByUserAndSpu(@Param("userId") Long userId, @Param("spuId") Long spuId);

    @Update("UPDATE favorite " +
            "SET deleted = 0, updated_at = NOW() " +
            "WHERE user_id = #{userId} AND spu_id = #{spuId} AND deleted = 1")
    int restore(@Param("userId") Long userId, @Param("spuId") Long spuId);
}