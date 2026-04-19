package com.pants.mall.dto;

import java.util.List;

public class PageResp<T> {

    private long total;
    private long page;
    private long size;
    private List<T> list;

    public PageResp() {}

    public static <T> PageResp<T> of(long total, long page, long size, List<T> list) {
        PageResp<T> r = new PageResp<>();
        r.setTotal(total);
        r.setPage(page);
        r.setSize(size);
        r.setList(list);
        return r;
    }

    public long getTotal() {
        return total;
    }
    public void setTotal(long total) {
        this.total = total;
    }
    public long getPage() {
        return page;
    }
    public void setPage(long page) {
        this.page = page;
    }
    public long getSize() {
        return size;
    }
    public void setSize(long size) {
        this.size = size;
    }
    public List<T> getList() {
        return list;
    }
    public void setList(List<T> list) {
        this.list = list;
    }
}