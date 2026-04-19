# 裤品线上交易电商系统后端（pants-mall-backend）

## 项目简介
本项目为基于 Spring Boot 的裤品线上交易电商系统后端服务，面向裤装商品展示、购物车、下单、支付记录、评价、收藏、地址管理、体型档案、推荐以及后台管理等业务场景。

## 技术栈
- Java 21
- Spring Boot 3.3.2
- Spring Security
- JWT
- MyBatis-Plus 3.5.6
- MySQL 8
- springdoc-openapi（Swagger UI）

## 主要功能
### 前台用户端
- 用户注册、登录
- 个人信息查询
- 地址管理
- 裤品商品查询、详情查看、对比
- 购物车管理
- 收藏管理
- 订单创建、取消、查询
- 支付记录查询
- 商品评价
- 体型档案管理
- 个性化推荐
- 售后申请
- 图片上传

### 后台管理端
- 商品分类管理
- SPU / SKU 商品管理
- 订单管理
- 售后审核
- 体型档案管理

## 运行环境
- JDK 21
- Maven 3.9+
- MySQL 8.x

## 默认运行配置
后端默认端口：

```text
http://localhost:8081
```

Swagger 地址：

```text
http://localhost:8081/swagger-ui/index.html
```

## 数据库准备
### 1. 创建数据库
```sql
CREATE DATABASE mall CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

### 2. 修改数据库连接
编辑文件：

```text
src/main/resources/application.yml
```

按本机环境修改以下配置：

```yml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/mall?useUnicode=true&characterEncoding=utf8&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Shanghai
    username: root
    password: 你的MySQL密码
```

### 3. 导入表结构与初始化数据
本项目当前配置为：

```yml
spring:
  sql:
    init:
      mode: never
```

因此项目启动时**不会自动执行** `schema.sql` 和 `data.sql`，需要手动导入。

导入表结构：

```bash
mysql -u root -p mall < src/main/resources/db/schema.sql
```

导入初始化数据：

```bash
mysql -u root -p mall < src/main/resources/db/data.sql
```

## 文件上传配置
项目默认使用本地目录保存上传文件，请按实际电脑环境修改：

```yml
upload:
  path: C:/Users/86178/pants-mall-uploads
```

访问方式为：

```text
http://localhost:8081/uploads/文件名
```

## 启动方式
在后端项目根目录执行：

```bash
mvn spring-boot:run
```

启动成功后访问：

```text
http://localhost:8081/swagger-ui/index.html
```

## 默认管理员账号
- 用户名：admin
- 密码：123456

说明：项目启动时会检查管理员账号，若密码不是 `123456`，会自动重置为 BCrypt 加密后的 `123456`，便于本地演示与测试。

## 常用接口示例
### 1. 登录获取 token
```bash
curl -X POST http://localhost:8081/auth/login -H "Content-Type: application/json" \
-d '{"username":"admin","password":"123456"}'
```

### 2. 用户注册
```bash
curl -X POST http://localhost:8081/auth/register -H "Content-Type: application/json" \
-d '{"username":"user1","password":"123456"}'
```

### 3. 商品分页查询
```bash
curl "http://localhost:8081/products?pageNo=1&pageSize=5&keyword=牛仔"
```

### 4. 商品详情查询
```bash
curl http://localhost:8081/products/1
```

### 5. 加入购物车
```bash
curl -X POST http://localhost:8081/cart/items -H "Content-Type: application/json" \
-H "Authorization: Bearer <token>" \
-d '{"skuId":1,"quantity":2}'
```

### 6. 查看购物车
```bash
curl http://localhost:8081/cart/items -H "Authorization: Bearer <token>"
```

### 7. 创建订单
```bash
curl -X POST http://localhost:8081/orders -H "Content-Type: application/json" \
-H "Authorization: Bearer <token>" \
-d '{"addressId":1,"items":[{"skuId":1,"quantity":1},{"skuId":2,"quantity":1}]}'
```

### 8. 取消订单
```bash
curl -X POST http://localhost:8081/orders/1/cancel -H "Authorization: Bearer <token>"
```

### 9. 申请售后
```bash
curl -X POST http://localhost:8081/after-sale/apply -H "Content-Type: application/json" \
-H "Authorization: Bearer <token>" \
-d '{"orderId":1,"type":"REFUND","reason":"尺码不合适","description":"希望退款"}'
```

### 10. 后台新增 SPU（管理员）
```bash
curl -X POST http://localhost:8081/admin/spu -H "Content-Type: application/json" \
-H "Authorization: Bearer <token>" \
-d '{"name":"夏季薄款工装裤","categoryId":1,"description":"轻薄透气","status":"ON","skus":[{"skuCode":"SKU-NEW-1","title":"黑色 L","price":199.00,"stock":50,"color":"黑","size":"L","status":"ON"},{"skuCode":"SKU-NEW-2","title":"黑色 XL","price":199.00,"stock":30,"color":"黑","size":"XL","status":"ON"}]}'
```

## 项目结构
```text
src/main/java/com/pants/mall
├── common        通用返回结构、异常处理
├── config        安全配置、Swagger、Web 配置
├── controller    接口层
├── dto           数据传输对象
├── entity        实体类
├── mapper        MyBatis-Plus 持久层
├── service       业务层
└── util          工具类

src/main/resources
├── application.yml
├── db/schema.sql
├── db/data.sql
└── mapper/*.xml
```

## 开发说明
- 当前前端开发服务器通过 `/api` 代理访问后端。
- 若前端页面图片无法显示，请确认后端已启动且 `upload.path` 配置有效。
- 若重新建库，请以最新 `schema.sql` 为准，避免和当前代码字段不一致。

## 注意事项
- `application.yml` 中包含本地开发配置，部署前建议改为环境变量或独立配置文件。
- 目前默认以本地开发环境运行为主，上传目录和数据库账号密码需要按本机环境调整。
