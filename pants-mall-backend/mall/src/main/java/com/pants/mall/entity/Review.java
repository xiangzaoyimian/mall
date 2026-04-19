package com.pants.mall.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@TableName("review")
@EqualsAndHashCode(callSuper = true)
public class Review extends BaseEntity {
    private Long id;
    private Long userId;
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
     * 购买尺码
     */
    private String purchaseSize;

    /**
     * 是否匿名：0否 1是
     */
    private Integer anonymous;

    /**
     * 评价图片，多个图片 URL 使用英文逗号分隔
     */
    private String images;
}