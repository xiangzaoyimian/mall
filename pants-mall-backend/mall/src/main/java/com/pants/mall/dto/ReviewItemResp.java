package com.pants.mall.dto;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class ReviewItemResp {

    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long userId;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long orderId;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long spuId;

    @JsonSerialize(using = ToStringSerializer.class)
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
     * 购买尺码
     */
    private String purchaseSize;

    /**
     * 是否匿名：0否 1是
     */
    private Integer anonymous;

    /**
     * 用户展示名（匿名时返回“匿名用户”）
     */
    private String username;

    /**
     * 评价图片 URL 列表
     */
    private List<String> images;

    private LocalDateTime createdAt;
}