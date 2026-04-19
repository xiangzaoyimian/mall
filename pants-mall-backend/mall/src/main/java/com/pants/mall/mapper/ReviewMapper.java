package com.pants.mall.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pants.mall.entity.Review;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.Map;

@Mapper
public interface ReviewMapper extends BaseMapper<Review> {

    @Select({
            "<script>",
            "SELECT",
            "  spu_id,",
            "  ROUND(AVG(rating), 2) AS avg_rating,",
            "  COUNT(*) AS review_count,",
            "  SUM(CASE WHEN rating &gt;= 4 THEN 1 ELSE 0 END) AS good_review_count",
            "FROM review",
            "WHERE deleted = 0",
            "  AND spu_id IN",
            "  <foreach collection='spuIds' item='id' open='(' separator=',' close=')'>",
            "    #{id}",
            "  </foreach>",
            "GROUP BY spu_id",
            "</script>"
    })
    List<Map<String, Object>> selectReviewAggBySpuIds(@Param("spuIds") List<Long> spuIds);
}