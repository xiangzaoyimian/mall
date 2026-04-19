package com.pants.mall.service;

import com.pants.mall.entity.Category;

import java.util.List;

public interface CategoryService {
    List<Category> listAll();

    Category getById(Long id);

    void save(Category category);

    void update(Long id, Category category);

    void delete(Long id);
}