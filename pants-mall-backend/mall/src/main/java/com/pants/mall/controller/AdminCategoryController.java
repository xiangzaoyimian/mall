package com.pants.mall.controller;

import com.pants.mall.common.Result;
import com.pants.mall.entity.Category;
import com.pants.mall.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/categories")
@RequiredArgsConstructor
public class AdminCategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public Result<List<Category>> list() {
        return Result.ok(categoryService.listAll());
    }

    @GetMapping("/{id}")
    public Result<Category> detail(@PathVariable("id") Long id) {
        return Result.ok(categoryService.getById(id));
    }

    @PostMapping
    public Result<Void> create(@RequestBody Category category) {
        categoryService.save(category);
        return Result.ok(null);
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable("id") Long id, @RequestBody Category category) {
        categoryService.update(id, category);
        return Result.ok(null);
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable("id") Long id) {
        categoryService.delete(id);
        return Result.ok(null);
    }
}