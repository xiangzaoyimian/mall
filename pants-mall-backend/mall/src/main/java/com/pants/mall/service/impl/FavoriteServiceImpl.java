package com.pants.mall.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.pants.mall.common.Result;
import com.pants.mall.entity.Favorite;
import com.pants.mall.mapper.FavoriteMapper;
import com.pants.mall.service.FavoriteService;
import com.pants.mall.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FavoriteServiceImpl implements FavoriteService {

    private final FavoriteMapper favoriteMapper;
    private final SecurityUtil securityUtil;

    @Override
    public Result<?> addFavorite(Long spuId) {

        Long userId = securityUtil.currentUserId();
        if (userId == null) {
            return Result.fail("未登录/无法获取当前用户");
        }

        // 关键：查“所有状态”的收藏（包含 deleted=1）
        Favorite any = favoriteMapper.selectAnyByUserAndSpu(userId, spuId);

        // 1) 已经收藏（deleted=0）
        if (any != null && Integer.valueOf(0).equals(any.getDeleted())) {
            return Result.ok("already_favorited");
        }

        // 2) 之前收藏过但被逻辑删除（deleted=1）=> 复活
        if (any != null && Integer.valueOf(1).equals(any.getDeleted())) {
            favoriteMapper.restore(userId, spuId);
            return Result.ok("ok");
        }

        // 3) 从未收藏过 => 新增
        Favorite f = new Favorite();
        f.setUserId(userId);
        f.setSpuId(spuId);
        favoriteMapper.insert(f);

        return Result.ok("ok");
    }

    @Override
    public Result<?> removeFavorite(Long spuId) {

        Long userId = securityUtil.currentUserId();
        if (userId == null) {
            return Result.fail("未登录/无法获取当前用户");
        }

        QueryWrapper<Favorite> qw = new QueryWrapper<>();
        qw.eq("user_id", userId).eq("spu_id", spuId);

        // 这里用 MP 的 delete：如果你启用了 @TableLogic，就是逻辑删除（deleted=1）
        favoriteMapper.delete(qw);

        return Result.ok("ok");
    }

    @Override
    public Result<?> listMyFavorites() {

        Long userId = securityUtil.currentUserId();
        if (userId == null) {
            return Result.fail("未登录/无法获取当前用户");
        }

        QueryWrapper<Favorite> qw = new QueryWrapper<>();
        qw.eq("user_id", userId);

        // MP 默认只会查 deleted=0，所以列表里不会出现已取消收藏的
        List<Favorite> list = favoriteMapper.selectList(qw);

        return Result.ok(list);
    }
}