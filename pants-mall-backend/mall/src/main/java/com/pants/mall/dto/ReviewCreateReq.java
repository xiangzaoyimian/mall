package com.pants.mall.dto;

import lombok.Data;

import java.util.List;

@Data
public class ReviewCreateReq {
    private Long orderId;
    private Long spuId;
    private Long skuId;
    private Integer rating;
    private String content;

    /**
     * 尺码感受：偏小 / 合适 / 偏大
     */
    private String sizeFeel;

    /**
     * 裤长感受：偏短 / 合适 / 偏长
     */
    private String lengthFeel;

    /**
     * 版型感受：修身 / 合适 / 宽松
     */
    private String fitFeel;

    /**
     * 面料感受：偏硬 / 适中 / 偏软
     */
    private String fabricFeel;

    /**
     * 购买尺码，例如 S / M / L / XL / 29 / 30
     */
    private String purchaseSize;

    /**
     * 是否匿名：0否 1是
     */
    private Integer anonymous;

    /**
     * 评价图片 URL 列表，最多 3 张
     */
    private List<String> images;
}