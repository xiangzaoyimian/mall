package com.pants.mall.dto;

import lombok.Data;

@Data
public class AiChatReq {
    private String question;
    private Long profileId;
}