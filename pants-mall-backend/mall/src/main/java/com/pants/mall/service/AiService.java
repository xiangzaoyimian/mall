package com.pants.mall.service;

import com.pants.mall.dto.AiChatReq;
import com.pants.mall.dto.AiChatResp;

public interface AiService {
    AiChatResp chat(AiChatReq req);
}