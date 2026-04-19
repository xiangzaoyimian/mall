package com.pants.mall.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pants.mall.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

@Mapper
public interface UserMapper extends BaseMapper<User> {

    // 相似身材的人在买什么裤子（如果你现在推荐逻辑已经放到 ProductSkuMapper，这个方法可以不用调用）
    List<Map<String, Object>> selectSimilarUserOrders(
            @Param("height") Integer height,
            @Param("waist") Integer waist
    );

    // 更新当前用户身体数据（null 表示不更新该字段）
    int updateBody(
            @Param("userId") Long userId,
            @Param("height") Integer height,
            @Param("waist") Integer waist,
            @Param("leg") Integer leg
    );

    // 修改当前昵称
    int updateNickname(
            @Param("userId") Long userId,
            @Param("nickname") String nickname
    );
}