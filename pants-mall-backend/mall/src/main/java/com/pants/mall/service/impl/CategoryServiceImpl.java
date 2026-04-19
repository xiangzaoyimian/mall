package com.pants.mall.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.pants.mall.common.BusinessException;
import com.pants.mall.entity.Category;
import com.pants.mall.mapper.CategoryMapper;
import com.pants.mall.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    private final CategoryMapper categoryMapper;

    @Override
    public List<Category> listAll() {
        return categoryMapper.selectList(
                new QueryWrapper<Category>()
                        .eq("deleted", 0)
                        .orderByAsc("sort")
                        .orderByAsc("id")
        );
    }

    @Override
    public Category getById(Long id) {
        Category category = categoryMapper.selectById(id);
        if (category == null || (category.getDeleted() != null && category.getDeleted() == 1)) {
            throw new BusinessException("分类不存在");
        }
        return category;
    }

    @Override
    public void save(Category category) {
        validateCategory(category);

        Long parentId = category.getParentId() == null ? 0L : category.getParentId();
        category.setParentId(parentId);

        checkDuplicateName(category.getName(), parentId, null);

        categoryMapper.insert(category);
    }

    @Override
    public void update(Long id, Category category) {
        Category old = categoryMapper.selectById(id);
        if (old == null || (old.getDeleted() != null && old.getDeleted() == 1)) {
            throw new BusinessException("分类不存在");
        }

        validateCategory(category);

        Long parentId = category.getParentId() == null ? 0L : category.getParentId();

        checkDuplicateName(category.getName(), parentId, id);

        Category toUpdate = new Category();
        toUpdate.setId(id);
        toUpdate.setName(category.getName().trim());
        toUpdate.setParentId(parentId);
        toUpdate.setSort(category.getSort());
        toUpdate.setStatus(category.getStatus().trim());

        categoryMapper.updateById(toUpdate);
    }

    @Override
    public void delete(Long id) {
        Category old = categoryMapper.selectById(id);
        if (old == null || (old.getDeleted() != null && old.getDeleted() == 1)) {
            throw new BusinessException("分类不存在");
        }

        categoryMapper.update(
                null,
                new UpdateWrapper<Category>()
                        .eq("id", id)
                        .eq("deleted", 0)
                        .set("deleted", 1)
        );
    }

    private void validateCategory(Category category) {
        if (category == null) {
            throw new BusinessException("分类参数不能为空");
        }

        if (!StringUtils.hasText(category.getName())) {
            throw new BusinessException("分类名称不能为空");
        }

        if (!StringUtils.hasText(category.getStatus())) {
            throw new BusinessException("分类状态不能为空");
        }

        category.setName(category.getName().trim());
        category.setStatus(category.getStatus().trim());

        if (category.getSort() == null) {
            category.setSort(0);
        }

        if (category.getSort() < 0) {
            throw new BusinessException("分类排序不能小于 0");
        }

        if (category.getParentId() != null && category.getParentId() < 0) {
            throw new BusinessException("父分类ID不合法");
        }
    }

    private void checkDuplicateName(String name, Long parentId, Long currentId) {
        QueryWrapper<Category> qw = new QueryWrapper<Category>()
                .eq("deleted", 0)
                .eq("parent_id", parentId)
                .eq("name", name.trim());

        List<Category> exists = categoryMapper.selectList(qw);

        if (exists == null || exists.isEmpty()) {
            return;
        }

        for (Category item : exists) {
            if (currentId == null || !currentId.equals(item.getId())) {
                throw new BusinessException("同一父分类下分类名称不能重复");
            }
        }
    }
}