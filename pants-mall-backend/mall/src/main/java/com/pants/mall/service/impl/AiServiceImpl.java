package com.pants.mall.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pants.mall.common.BusinessException;
import com.pants.mall.config.AiProperties;
import com.pants.mall.dto.AiChatReq;
import com.pants.mall.dto.AiChatResp;
import com.pants.mall.dto.RecommendItemResp;
import com.pants.mall.entity.UserBodyProfile;
import com.pants.mall.mapper.UserBodyProfileMapper;
import com.pants.mall.service.AiService;
import com.pants.mall.service.RecommendService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiServiceImpl implements AiService {

    private final UserBodyProfileMapper profileMapper;
    private final RecommendService recommendService;
    private final AiProperties aiProperties;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Override
    public AiChatResp chat(AiChatReq req) {
        if (req == null) {
            throw new BusinessException("请求不能为空");
        }
        if (req.getProfileId() == null) {
            throw new BusinessException("profileId不能为空");
        }
        if (req.getQuestion() == null || req.getQuestion().trim().isEmpty()) {
            throw new BusinessException("问题不能为空");
        }
        if (aiProperties.getApiKey() == null || aiProperties.getApiKey().trim().isEmpty()) {
            throw new BusinessException("AI配置未完成，请检查API Key");
        }
        if (aiProperties.getBaseUrl() == null || aiProperties.getBaseUrl().trim().isEmpty()) {
            throw new BusinessException("AI配置未完成，请检查baseUrl");
        }
        if (aiProperties.getModel() == null || aiProperties.getModel().trim().isEmpty()) {
            throw new BusinessException("AI配置未完成，请检查model");
        }

        UserBodyProfile profile = profileMapper.selectById(req.getProfileId());
        if (profile == null || (profile.getDeleted() != null && profile.getDeleted() == 1)) {
            throw new BusinessException("档案不存在");
        }

        List<RecommendItemResp> recommendList =
                recommendService.recommendByProfile(req.getProfileId());

        String systemPrompt = buildSystemPrompt();
        String userPrompt = buildUserPrompt(profile, recommendList, req.getQuestion().trim());

        try {
            String answer = callDeepSeek(systemPrompt, userPrompt);
            AiChatResp resp = new AiChatResp();
            resp.setAnswer(answer);
            return resp;
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException("AI调用失败：" + e.getMessage());
        }
    }

    private String buildSystemPrompt() {
        return "你是 Pants Mall 的智能选裤助手，也是专业裤装导购。\n"
                + "你的任务不是重新计算推荐结果，而是在系统已有推荐结果基础上，给用户做简洁、自然、可信的选裤建议。\n\n"

                + "【必须遵守的规则】\n"
                + "1. 只能基于系统提供的【用户体型档案】、【推荐商品】和【用户问题】回答；\n"
                + "2. 禁止编造不存在的商品、数据、版型信息或场景；\n"
                + "3. 优先引用推荐列表中靠前、匹配度更高的商品；\n"
                + "4. 必须尽量点名具体商品名，不能一直说“这几条裤子”；\n"
                + "5. 必须优先参考系统已有字段：匹配度、推荐等级、推荐理由、腰围、裤长、版型；\n"
                + "6. 不要推翻系统推荐结论，AI只负责解释、比较和给建议；\n"
                + "7. 回答必须自然、像导购，不能像程序日志，也不能像论文或说明书。\n\n"

                + "【特别加强要求】\n"
                + "1. 回答时必须体现对比关系，至少有一句明确说明“为什么更推荐A，而不是B”；\n"
                + "2. 如果有多条推荐商品，优先比较前2到3条，不要把所有商品都讲成差不多；\n"
                + "3. 优先从匹配度、腰围差异、裤长差异、推荐理由差异中说明谁更优先；\n"
                + "4. 如果第二名也适合，可以说“也可以作为备选”，但必须说明它为什么排在后面；\n"
                + "5. 禁止大量使用“都适合”“都可以”“版型舒适”“比较稳妥”这类空泛表述；\n"
                + "6. 如果版型字段是英文，如 REGULAR、STRAIGHT、SLIM、LOOSE，只把它当作内部参考，不要照搬英文原词。\n\n"

                + "【问题类型处理】\n"
                + "1. 如果用户问“为什么推荐这几条裤子”，重点解释：匹配度、腰围、裤长、版型、系统推荐理由；\n"
                + "2. 如果用户问“我更适合修身还是直筒”，要直接给倾向性建议，并说明是哪几条商品更贴近这个建议；\n"
                + "3. 如果用户问“哪条更适合通勤 / 日常 / 休闲”，不要只重复匹配度，要结合版型风格、穿着稳定性、日常搭配感来回答；\n"
                + "4. 如果用户问“优先选哪条”，优先推荐匹配度更高、推荐等级更高、推荐理由更充分的商品；\n"
                + "5. 如果前两条商品差距明显，必须把差异说出来。\n\n"

                + "【输出结构】\n"
                + "必须严格按以下四个标题输出，顺序不能变，缺一不可：\n"
                + "【结论】\n"
                + "【原因】\n"
                + "【适合场景】\n"
                + "【优先建议】\n\n"

                + "【输出格式要求】\n"
                + "1. 【结论】只写1到2句，直接回答问题，并尽量给出明确倾向；\n"
                + "2. 【原因】必须用1. 2. 3.列点，优先写最关键的2到3条，不要凑数；\n"
                + "3. 【原因】里至少有1条是“对比说明”，明确说明A为什么优先于B；\n"
                + "4. 【适合场景】只写1到2句，要自然，不要空泛；\n"
                + "5. 【优先建议】要明确告诉用户先看哪条、再看哪条，并说明第二选择为什么排后；\n"
                + "6. 全文保持简洁，不要写成长篇；\n"
                + "7. 语言必须是中文。\n\n"
                + "8. 在【结论】中尽量加入一句“结合你的体型特点”的总结，让建议更像真人导购；\n"

                + "【特别要求】\n"
                + "1. 如果推荐商品不为空，回答中至少提到1个具体商品名；\n"
                + "2. 如果推荐商品为空，就明确说明当前暂无推荐商品，并建议用户先完善档案；\n"
                + "3. 如果某个场景没有充分证据，不要硬夸，只能做保守、自然的建议。";
    }

    private String buildUserPrompt(
            UserBodyProfile profile,
            List<RecommendItemResp> recommendList,
            String question
    ) {
        StringBuilder sb = new StringBuilder();

        sb.append("【用户体型档案】\n");
        sb.append("档案名称：").append(nullSafe(profile.getName())).append("\n");
        sb.append("身高：").append(profile.getHeightCm() == null ? "-" : profile.getHeightCm()).append("cm\n");
        sb.append("体重：").append(profile.getWeightKg() == null ? "-" : profile.getWeightKg()).append("kg\n");
        sb.append("腰围：").append(profile.getWaistCm() == null ? "-" : profile.getWaistCm()).append("cm\n");
        sb.append("腿长：").append(profile.getLegLengthCm() == null ? "-" : profile.getLegLengthCm()).append("cm\n\n");

        sb.append("【推荐商品】\n");
        if (recommendList == null || recommendList.isEmpty()) {
            sb.append("当前暂无推荐商品。\n");
        } else {
            for (int i = 0; i < Math.min(3, recommendList.size()); i++) {
                RecommendItemResp item = recommendList.get(i);
                sb.append(i + 1).append(". ").append(nullSafe(item.getName())).append("\n");
                sb.append("   匹配度：").append(item.getMatchScore() == null ? "-" : item.getMatchScore()).append("%\n");
                sb.append("   推荐等级：").append(nullSafe(item.getRecommendType())).append("\n");
                sb.append("   版型字段：").append(nullSafe(item.getFitType())).append("\n");
                sb.append("   腰围：").append(item.getWaistCm() == null ? "-" : item.getWaistCm()).append("cm\n");
                sb.append("   裤长：").append(item.getLengthCm() == null ? "-" : item.getLengthCm()).append("cm\n");
                sb.append("   库存：").append(item.getStock() == null ? "-" : item.getStock()).append("\n");
                sb.append("   价格：").append(item.getPrice() == null ? "-" : item.getPrice()).append("\n");
                sb.append("   系统推荐理由：").append(nullSafe(item.getReason())).append("\n");
            }
        }

        sb.append("\n【补充说明】\n");
        sb.append("1. 系统推荐理由可信度高，回答时要优先吸收这些结论，不要忽略；\n");
        sb.append("2. 如果用户问“为什么推荐”，重点解释系统推荐理由里已经给出的匹配依据；\n");
        sb.append("3. 如果用户问“修身还是直筒”，请直接给建议，不要只罗列数据；\n");
        sb.append("4. 如果用户问“通勤”，回答要更像穿着建议，例如更适合日常搭配、更稳当、更容易作为通勤选择；\n");
        sb.append("5. 如果版型字段是英文，不要直接照抄英文原词到回答里；\n");
        sb.append("6. 必须体现前两条商品之间的差异，不能只说它们都不错；\n");
        sb.append("7. 如果第一条更优先，要把“优先原因”明确说出来；\n");
        sb.append("8. 不要说空话，不要机械重复同一句意思。\n");

        sb.append("\n【用户问题】\n");
        sb.append(question).append("\n\n");

        sb.append("请现在严格按照【结论】【原因】【适合场景】【优先建议】四段结构输出。");
        return sb.toString();
    }

    private String callDeepSeek(String systemPrompt, String userPrompt)
            throws IOException, InterruptedException {

        String url = trimSlash(aiProperties.getBaseUrl()) + "/chat/completions";

        Map<String, Object> body = Map.of(
                "model", aiProperties.getModel(),
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)
                ),
                "stream", false,
                "temperature", 0.25,
                "max_tokens", 600
        );

        String json = objectMapper.writeValueAsString(body);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + aiProperties.getApiKey().trim())
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        HttpResponse<String> response =
                httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        System.out.println("Request body: " + json);
        System.out.println("Response status: " + response.statusCode());
        System.out.println("Response body: " + response.body());

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new BusinessException("AI服务响应异常，状态码：" + response.statusCode() + "，返回：" + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        JsonNode choices = root.path("choices");

        if (!choices.isArray() || choices.isEmpty()) {
            throw new BusinessException("AI返回结果为空");
        }

        String content = choices.get(0)
                .path("message")
                .path("content")
                .asText("");

        if (content == null || content.trim().isEmpty()) {
            throw new BusinessException("AI返回内容为空");
        }

        return content.trim();
    }

    private String trimSlash(String s) {
        if (s == null) {
            return "";
        }
        if (s.endsWith("/")) {
            return s.substring(0, s.length() - 1);
        }
        return s;
    }

    private String nullSafe(String s) {
        return s == null || s.trim().isEmpty() ? "-" : s;
    }
}