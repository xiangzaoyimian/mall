# 基于 Spring Boot 的裤品线上交易电商系统 README

## 1. 项目简介

本项目是一个面向**裤装垂直场景**的线上交易电商系统，采用**前后端分离**架构实现。

系统围绕“裤品”这一细分商品类型展开设计，不仅具备普通电商系统常见的注册登录、商品浏览、购物车、下单、支付、评价、售后等功能，还结合裤装商品的业务特点加入了以下特色能力：

- 按颜色、尺码、腰围、裤长、裤脚、版型等维度进行筛选
- 维护用户体型档案（身高、体重、腰围、腿长）
- 基于体型档案进行裤装推荐
- 提供 AI 导购问答能力
- 支持商品对比、收藏、地址管理、售后处理和后台管理

项目适合作为**本科毕业设计 / 课程设计 / 电商系统实训项目**使用。

---

## 2. 项目整体结构

项目解压后的核心目录如下：

```text
zcc毕业设计项目/
├── pants-mall-backend/
│   └── mall/                     # Spring Boot 后端工程
└── pants-mall-frontend/          # React + TypeScript 前端工程
```

也就是说：

- `pants-mall-backend/mall` 是后端项目根目录
- `pants-mall-frontend` 是前端项目根目录

---

## 3. 技术架构说明

### 3.1 后端技术栈

后端采用 Java Web 主流开发方案，核心技术如下：

- Java 21
- Spring Boot 3.3.2
- Spring Security
- JWT（用于无状态登录认证）
- MyBatis-Plus 3.5.6
- MySQL 8.x
- SpringDoc OpenAPI（Swagger 接口文档）

### 3.2 前端技术栈

前端采用轻量级前后端分离方案，核心技术如下：

- React 19
- TypeScript 5
- Vite 7
- Axios
- 原生 CSS / 行内样式为主

### 3.3 系统运行方式

系统采用前后端分离运行方式：

- 前端开发服务器默认运行在：`http://localhost:5173`
- 后端服务默认运行在：`http://localhost:8081`
- 前端通过 Vite 代理将 `/api` 请求转发给后端

请求流向如下：

```text
浏览器 -> React 前端 -> /api 代理 -> Spring Boot 后端 -> MySQL 数据库
```

如果涉及图片上传：

```text
浏览器 -> 前端上传接口 -> 后端保存到本地目录 -> /uploads/xxx 访问图片资源
```

---

## 4. 系统功能概览

### 4.1 用户端功能

普通用户可以完成以下操作：

- 用户注册、登录
- 查看商品列表与商品详情
- 条件筛选与关键字搜索
- 商品对比
- 加入购物车、修改购物车数量
- 收藏 / 取消收藏
- 管理收货地址
- 创建订单、取消订单、支付订单、确认收货
- 提交商品评价
- 维护体型档案
- 查看个性化推荐结果
- 使用 AI 导购提问
- 提交售后申请（退款 / 退货退款）

### 4.2 管理端功能

管理员可以完成以下操作：

- 后台首页概览
- 商品分类管理
- 商品 SPU / SKU 管理
- 商品上架 / 下架
- 订单查询与发货、完结处理
- 售后审核与收货处理

---

## 5. 前后端协作逻辑

### 5.1 前端负责什么

前端主要负责：

- 页面展示与用户交互
- 表单收集与校验
- 登录状态保存在浏览器本地
- 调用后端 API 获取业务数据
- 渲染商品、订单、推荐、评价、售后等页面

### 5.2 后端负责什么

后端主要负责：

- 账号认证与权限识别
- 业务规则处理
- 订单、购物车、收藏、评价、售后等核心逻辑
- 数据库存取
- JWT 鉴权
- 图片上传与静态资源映射
- 提供 Swagger 接口文档

### 5.3 登录认证流程

系统的登录方式是：

1. 用户在前端输入用户名和密码
2. 前端调用 `/auth/login`
3. 后端校验账号密码
4. 校验通过后返回 JWT token
5. 前端将 token 保存到 `localStorage`
6. 后续请求通过 Axios 请求拦截器自动携带 `Authorization: Bearer <token>`
7. 后端通过 `JwtAuthFilter` 解析 token，识别当前用户身份

---

## 6. 后端项目详细说明

后端项目根目录：

```text
pants-mall-backend/mall
```

### 6.1 后端目录结构

```text
src/main/java/com/pants/mall
├── common        # 通用类：返回结构、常量、异常、状态枚举
├── config        # 配置类：安全配置、JWT 过滤器、Swagger、MyBatis 等
├── controller    # 控制层：提供 REST API
├── dto           # 请求 / 响应数据传输对象
├── entity        # 实体类：与数据库表对应
├── mapper        # MyBatis-Plus Mapper 接口
├── service       # 业务接口
├── service/impl  # 业务实现类
├── service/task  # 定时任务（如订单超时）
└── util          # 工具类

src/main/resources
├── application.yml
├── db/schema.sql
├── db/data.sql
└── mapper/*.xml
```

### 6.2 后端分层设计解释

#### （1）controller 层
用于接收前端请求、返回统一结果对象 `Result<T>`。

例如：

- `AuthController`：注册、登录
- `ProductController`：商品列表、详情、对比
- `OrderController`：订单相关接口
- `ReviewController`：评价相关接口
- `RecommendController`：推荐相关接口

#### （2）service 层
负责具体业务逻辑，例如：

- 购物车是否已有同一 SKU
- 创建订单时是否扣减库存
- 支付后是否更新订单状态
- 推荐结果如何计算匹配度

#### （3）mapper 层
通过 MyBatis-Plus 访问数据库，负责 CRUD 与部分自定义 SQL。

#### （4）entity 层
对应数据库中的表结构，例如：

- `User`
- `ProductSpu`
- `ProductSku`
- `OrderInfo`
- `OrderItem`
- `Review`
- `AfterSale`

### 6.3 后端核心配置说明

后端主配置文件：

```text
src/main/resources/application.yml
```

当前代码中的关键配置包括：

- 端口：`8081`
- MySQL 数据库连接
- MyBatis-Plus 配置
- JWT 密钥与过期时间
- Swagger 路径
- AI 接口配置
- 文件上传目录配置

建议你在本地使用时重点修改以下几项：

```yml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/mall?useUnicode=true&characterEncoding=utf8&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Shanghai
    username: root
    password: 你的MySQL密码

jwt:
  secret: 你自己的JWT密钥
  expireMinutes: 1440

ai:
  deepseek:
    baseUrl: 你的AI服务地址
    apiKey: 你的AI Key
    model: 你的模型名称

upload:
  path: 你的本地上传目录
```

> 注意：项目源码中的 `application.yml` 带有明显的本地开发信息，正式提交或部署时建议脱敏处理，不要直接公开数据库密码和 API Key。

### 6.4 数据库初始化方式

数据库脚本位于：

```text
src/main/resources/db/schema.sql
src/main/resources/db/data.sql
```

当前配置中：

```yml
spring:
  sql:
    init:
      mode: never
```

表示**项目启动时不会自动建表和导入初始数据**，因此需要手动执行脚本。

#### 建议操作步骤

1. 先创建数据库：

```sql
CREATE DATABASE mall CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

2. 再导入表结构：

```bash
mysql -u root -p mall < src/main/resources/db/schema.sql
```

3. 导入初始化数据：

```bash
mysql -u root -p mall < src/main/resources/db/data.sql
```

### 6.5 数据库表说明

系统核心表如下：

| 表名 | 说明 |
|---|---|
| `user` | 用户表，保存账号、密码、角色、昵称以及基础体型字段 |
| `user_body_profile` | 用户体型档案表，保存多个体型档案 |
| `address` | 收货地址表 |
| `category` | 商品分类表 |
| `product_spu` | 商品 SPU 表，表示商品主信息 |
| `product_sku` | 商品 SKU 表，表示具体规格，如颜色、尺码、裤长、腰围 |
| `cart_item` | 购物车项表 |
| `favorite` | 收藏表 |
| `order_info` | 订单主表 |
| `order_item` | 订单明细表 |
| `payment` | 支付记录表 |
| `review` | 商品评价表 |
| `after_sale` | 售后申请表 |

### 6.6 为什么要区分 SPU 和 SKU

本项目商品建模采用典型电商设计：

- **SPU（Standard Product Unit）**：商品主信息，例如“经典直筒牛仔裤”
- **SKU（Stock Keeping Unit）**：具体规格，例如“蓝色 / L / 腰围 84 / 裤长 100”

这样设计的好处是：

- 商品详情页可以展示一个 SPU 下的多个规格
- 库存按 SKU 维度管理更精确
- 可以支持裤装场景下更细的尺码筛选

### 6.7 后端主要接口分组

下面是根据 controller 实际代码整理的接口分组。

#### 6.7.1 认证与个人中心

| 接口 | 方法 | 说明 |
|---|---|---|
| `/auth/login` | POST | 用户登录 |
| `/auth/register` | POST | 用户注册 |
| `/me` | GET | 获取当前登录用户信息 |
| `/me/body` | POST | 更新当前用户基础体型信息 |
| `/me/nickname` | PUT | 修改昵称 |

#### 6.7.2 地址管理

| 接口 | 方法 | 说明 |
|---|---|---|
| `/address/list` | GET | 查询当前用户地址列表 |
| `/address/save` | POST | 新增或保存地址 |
| `/address/{id}` | DELETE | 删除地址 |
| `/address/{id}/default` | PUT | 设置默认地址 |

#### 6.7.3 商品与搜索

| 接口 | 方法 | 说明 |
|---|---|---|
| `/products` | GET | 商品分页查询 |
| `/products/{id}` | GET | 商品详情 |
| `/products/compare` | GET | 商品对比 |
| `/pants/options` | GET | 查询某商品可选规格 |
| `/pants/search` | GET | 裤装规格搜索 |
| `/pants/search-by-length` | GET | 按裤长搜索 |

#### 6.7.4 购物车与收藏

| 接口 | 方法 | 说明 |
|---|---|---|
| `/cart/items` | GET | 查看购物车 |
| `/cart/items` | POST | 加入购物车 |
| `/cart/items` | PUT | 更新购物车数量 / 删除项 |
| `/favorites` | GET | 查看收藏 |
| `/favorites/{spuId}` | POST | 收藏商品 |
| `/favorites/{spuId}` | DELETE | 取消收藏 |

#### 6.7.5 订单与支付

| 接口 | 方法 | 说明 |
|---|---|---|
| `/orders` | POST | 创建订单 |
| `/orders` | GET | 查询订单列表 |
| `/orders/{id}` | GET | 查询订单详情 |
| `/orders/{id}/cancel` | POST | 取消订单 |
| `/orders/{id}/pay` | POST | 模拟支付 |
| `/orders/{id}/finish` | POST | 用户确认收货 / 完成 |

#### 6.7.6 评价与售后

| 接口 | 方法 | 说明 |
|---|---|---|
| `/review/create` | POST | 提交评价 |
| `/review/list` | GET | 查询商品评价 |
| `/orders/{id}/after-sale` | POST | 发起售后申请 |
| `/orders/{id}/after-sale` | GET | 查询订单售后信息 |
| `/orders/{id}/after-sale/returned` | POST | 标记已寄回 |

#### 6.7.7 体型档案、推荐与 AI

| 接口 | 方法 | 说明 |
|---|---|---|
| `/body-profile` | POST | 新增体型档案 |
| `/body-profile` | PUT | 修改体型档案 |
| `/body-profile/{id}` | DELETE | 删除体型档案 |
| `/body-profile/list` | GET | 查询体型档案列表 |
| `/recommend/pants/by-profile` | GET | 根据体型档案推荐裤装 |
| `/ai/chat` | POST | AI 导购问答 |

#### 6.7.8 文件上传

| 接口 | 方法 | 说明 |
|---|---|---|
| `/upload` | POST | 上传图片文件 |
| `/uploads/**` | GET | 访问上传后的静态资源 |

#### 6.7.9 后台管理接口

| 接口 | 方法 | 说明 |
|---|---|---|
| `/admin/spu` | GET | 后台商品列表 |
| `/admin/spu/{id}` | GET | 后台商品详情 |
| `/admin/spu` | POST | 新增商品 |
| `/admin/spu/{id}` | PUT | 修改商品 |
| `/admin/spu/{id}` | DELETE | 删除商品 |
| `/admin/spu/{id}/on` | PUT | 商品上架 |
| `/admin/spu/{id}/off` | PUT | 商品下架 |
| `/admin/categories` | GET | 分类列表 |
| `/admin/categories/{id}` | GET | 分类详情 |
| `/admin/categories` | POST | 新增分类 |
| `/admin/categories/{id}` | PUT | 修改分类 |
| `/admin/categories/{id}` | DELETE | 删除分类 |
| `/admin/orders` | GET | 后台订单列表 |
| `/admin/orders/{id}` | GET | 后台订单详情 |
| `/admin/orders/{id}/ship` | PUT | 发货 |
| `/admin/orders/{id}/finish` | PUT | 后台完结订单 |
| `/admin/after-sales` | GET | 售后分页查询 |
| `/admin/after-sales/{id}` | GET | 售后详情 |
| `/admin/after-sales/{id}/audit` | PUT | 售后审核 |
| `/admin/after-sales/{id}/receive` | PUT | 收到退货 |
| `/admin/body-profile/{id}` | GET | 查看体型档案详情 |

### 6.8 后端安全机制说明

项目使用 `Spring Security + JWT` 实现登录认证。

安全配置类位于：

```text
src/main/java/com/pants/mall/config/SecurityConfig.java
```

其设计思路为：

- `/auth/**`、`/products/**`、`/pants/**`、`/recommend/**`、`/upload/**`、`/uploads/**` 等接口允许匿名访问
- 其他接口默认要求登录后访问
- JWT 过滤器 `JwtAuthFilter` 会解析请求头中的 token
- 认证成功后把用户身份写入 Spring Security 上下文

### 6.9 推荐模块说明

推荐功能是本项目的重要特色之一。

推荐服务核心逻辑位于：

```text
service/impl/RecommendServiceImpl.java
```

从代码逻辑看，推荐并不是简单按销量排序，而是综合以下因素进行匹配：

- 用户体型档案中的腰围、腿长、身高、体重
- SKU 的腰围、裤长、版型等属性
- 历史行为偏好（收藏、加购、购买）
- 商品库存、销量等辅助因素

推荐结果中会返回：

- 商品信息
- 匹配度 `matchScore`
- 推荐等级 `recommendType`
- 推荐理由 `reason`

因此这个模块在论文答辩中可以作为系统亮点重点介绍。

### 6.10 AI 模块说明

AI 接口位于：

```text
/ai/chat
```

AI 服务实现类位于：

```text
service/impl/AiServiceImpl.java
```

它的工作方式不是“直接让 AI 自由回答”，而是：

1. 先读取用户体型档案
2. 再获取系统已有推荐结果
3. 将体型信息、推荐结果、用户问题一起组装为提示词
4. 调用外部 AI 服务生成“导购型回答”

因此 AI 模块在定位上更像是：

- **推荐结果解释器**
- **智能导购问答助手**

而不是完全替代推荐算法。

### 6.11 文件上传说明

上传接口位于：

```text
/upload
```

后端会把文件保存到 `upload.path` 指定目录，并返回相对访问路径：

```text
/uploads/文件名
```

因此要想让商品图、评价图正常显示，需要保证：

- 上传目录存在且可写
- `upload.path` 配置正确
- 后端静态资源映射正常

### 6.12 Swagger 接口文档

后端启动成功后可访问：

```text
http://localhost:8081/swagger-ui/index.html
```

可以用它来：

- 查看接口清单
- 调试 API
- 验证请求参数与返回结构

### 6.13 后端启动步骤

在后端工程目录执行：

```bash
cd pants-mall-backend/mall
mvn spring-boot:run
```

如果希望先打包再运行：

```bash
mvn clean package
java -jar target/mall-1.0.0.jar
```

---

## 7. 前端项目详细说明

前端项目根目录：

```text
pants-mall-frontend
```

### 7.1 前端目录结构

```text
src
├── api                    # 接口封装
├── App.tsx                # 前台用户端总入口
├── AdminApp.tsx           # 后台管理端总入口
├── LoginPage.tsx          # 登录页
├── RegisterPage.tsx       # 注册页
├── PantsListPage.tsx      # 商品列表页
├── SearchResultPage.tsx   # 搜索结果页
├── ProductDetailPage.tsx  # 商品详情页
├── CartPage.tsx           # 购物车页
├── OrdersPage.tsx         # 订单页
├── FavoritesPage.tsx      # 收藏页
├── AddressPage.tsx        # 地址管理页
├── BodyProfilePage.tsx    # 体型档案页
├── RecommendPage.tsx      # 推荐页
├── UserProfilePage.tsx    # 个人信息页
├── AdminHomePage.tsx      # 后台首页
├── AdminProductPage.tsx   # 后台商品管理
├── AdminOrdersPage.tsx    # 后台订单管理
├── AdminAfterSalePage.tsx # 后台售后管理
└── AdminCategoryPage.tsx  # 后台分类管理
```

### 7.2 前端入口说明

前端入口文件为：

```text
src/main.tsx
```

它会挂载 `App.tsx`。

在 `App.tsx` 中，前端根据本地保存的角色进行界面切换：

- 如果 `role === 'ADMIN'`，则渲染 `AdminApp`
- 否则渲染普通用户商城页面

这说明前端本质上是**一个项目中包含两套界面**：

- 用户端界面
- 管理端界面

### 7.3 前端 API 封装说明

所有接口请求统一封装在：

```text
src/api/
```

例如：

- `auth.ts`：登录、获取当前用户、修改昵称
- `products.ts`：商品列表、详情、对比
- `cart.ts`：购物车操作
- `orders.ts`：订单操作
- `review.ts`：评价操作
- `recommend.ts`：推荐操作
- `afterSale.ts`：售后操作
- `ai.ts`：AI 问答

公共 Axios 客户端位于：

```text
src/api/client.ts
```

其主要作用有：

- 统一 `baseURL = '/api'`
- 自动从 `localStorage` 读取 token
- 自动在请求头加上 `Authorization`
- 当后端返回 401/403 时，自动清理本地登录信息

### 7.4 前端路由组织方式说明

这个前端项目没有采用 `react-router`，而是采用**单页面状态切换**方式。

也就是说：

- `App.tsx` 内部通过 `tab` 状态管理页面切换
- 不同页面组件根据当前状态渲染
- 商品详情、搜索页、订单页等页面通过组件 props 和状态传递数据

这种写法的特点是：

**优点：**
- 结构直观
- 适合毕业设计演示
- 不依赖额外路由库

**缺点：**
- 页面状态较多时会集中在 `App.tsx`
- 后续扩展维护成本会变高

### 7.5 前端主要页面说明

#### （1）登录与注册页面

- `LoginPage.tsx`
- `RegisterPage.tsx`

用于完成账号注册与登录，并在登录成功后将 token、用户名、角色等信息写入浏览器本地存储。

#### （2）商品列表与搜索页面

- `PantsListPage.tsx`
- `SearchResultPage.tsx`

负责展示商品列表，并支持：

- 关键字搜索
- 价格区间筛选
- 颜色筛选
- 尺码筛选
- 版型筛选
- 腰围区间筛选
- 裤长区间筛选
- 是否只看有库存商品
- 排序（销量、价格、新品等）

#### （3）商品详情页

- `ProductDetailPage.tsx`

负责展示：

- 商品主信息
- SKU 规格选择
- 商品评价
- 商品对比入口
- 加入购物车 / 收藏 / 下单相关操作

#### （4）购物车页

- `CartPage.tsx`

负责：

- 查看购物车商品
- 修改数量
- 删除商品
- 发起下单

#### （5）订单页

- `OrdersPage.tsx`

负责：

- 查看订单列表
- 查看订单详情
- 支付订单
- 取消订单
- 确认收货
- 发起售后
- 提交评价

#### （6）收藏页

- `FavoritesPage.tsx`

负责查看和取消收藏。

#### （7）地址管理页

- `AddressPage.tsx`

负责新增、删除、设置默认收货地址。

#### （8）体型档案页

- `BodyProfilePage.tsx`

负责新增和维护用户体型档案，为推荐模块提供基础数据。

#### （9）推荐页

- `RecommendPage.tsx`

这是本项目的特色页面之一，功能包括：

- 按体型档案获取推荐商品
- 展示推荐理由与匹配度
- 调用 AI 接口进行选裤问答

#### （10）个人信息页

- `UserProfilePage.tsx`

负责显示用户资料并支持修改昵称、基础身体参数。

### 7.6 管理端页面说明

后台主入口：

```text
src/AdminApp.tsx
```

后台页面包括：

- `AdminHomePage.tsx`：后台首页
- `AdminProductPage.tsx`：商品管理
- `AdminOrdersPage.tsx`：订单管理
- `AdminAfterSalePage.tsx`：售后管理
- `AdminCategoryPage.tsx`：分类管理

后台页面主要通过调用 `/admin/**` 接口完成管理操作。

### 7.7 前端与后端联调机制

Vite 代理配置位于：

```ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8081',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
  },
}
```

这表示：

- 前端请求 `/api/products`
- 实际会被转发到 `http://localhost:8081/products`

因此本地联调时，需要同时启动前后端服务。

### 7.8 图片显示说明

当前图片访问逻辑依赖后端 `http://localhost:8081/uploads/...`。

因此如果你修改了后端端口或部署地址，需要同步检查：

- 前端拼接的图片访问地址
- Vite 代理配置
- 上传目录映射是否仍然正确

### 7.9 前端启动步骤

在前端工程目录执行：

```bash
cd pants-mall-frontend
npm install
npm run dev
```

默认访问地址：

```text
http://localhost:5173
```

### 7.10 前端打包

```bash
npm run build
```

打包后输出目录：

```text
dist/
```

---

## 8. 推荐的本地运行顺序

建议按下面顺序运行项目。

### 第一步：准备数据库

- 安装并启动 MySQL
- 创建 `mall` 数据库
- 导入 `schema.sql` 和 `data.sql`

### 第二步：修改后端配置

修改：

```text
pants-mall-backend/mall/src/main/resources/application.yml
```

重点改：

- 数据库账号密码
- AI 配置（如果需要）
- 上传目录

### 第三步：启动后端

```bash
cd pants-mall-backend/mall
mvn spring-boot:run
```

启动成功后可测试：

- Swagger：`http://localhost:8081/swagger-ui/index.html`

### 第四步：启动前端

```bash
cd pants-mall-frontend
npm install
npm run dev
```

浏览器访问：

- 前端首页：`http://localhost:5173`

---

## 9. 默认测试账号

### 管理员账号

项目初始化数据中包含管理员账号：

- 用户名：`admin`
- 密码：`123456`

并且后端存在 `AdminPasswordFixRunner`，项目启动时会检查管理员密码，如不是 `123456` 会自动重置为该密码对应的 BCrypt 值，便于本地演示。

### 普通用户账号

普通用户可以直接通过前端注册页面自行注册。

---

## 10. 典型业务流程说明

### 10.1 用户购买流程

1. 用户注册 / 登录
2. 浏览商品列表
3. 查看商品详情
4. 选择 SKU 规格（颜色、尺码、裤长等）
5. 加入购物车
6. 选择收货地址并创建订单
7. 模拟支付
8. 查看订单状态
9. 确认收货
10. 提交评价

### 10.2 用户推荐流程

1. 用户新增体型档案
2. 进入推荐页面
3. 选择某个体型档案
4. 前端调用 `/recommend/pants/by-profile`
5. 后端根据体型信息与商品属性计算匹配度
6. 返回推荐商品与推荐理由
7. 用户还可以继续调用 `/ai/chat` 获取导购式解释

### 10.3 售后处理流程

1. 用户在订单中发起售后申请
2. 后端写入 `after_sale` 表
3. 管理员在后台查看售后列表
4. 管理员审核通过 / 拒绝
5. 若为退货退款，用户可标记已寄回
6. 管理员确认收到退货并完成售后流程

---

## 11. 项目优点与特色

从毕业设计角度看，这个项目的优势主要体现在：

1. **前后端分离完整**：不是单体页面，而是完整的前后端协作项目
2. **垂直业务建模清晰**：围绕裤装构建了更细粒度的参数体系
3. **推荐模块有一定特色**：包含体型档案和行为偏好匹配逻辑
4. **售后流程较完整**：不仅有下单支付，还有退款与退货退款处理
5. **后台管理相对完善**：覆盖商品、分类、订单、售后等管理场景
6. **AI 模块增强展示效果**：适合毕业设计答辩时演示亮点

---

## 12. 当前项目中需要注意的问题

为了便于你后续完善论文和答辩，这里也列出几个当前代码中值得注意的点：

### 12.1 配置文件包含本地敏感信息

`application.yml` 中出现了本地数据库密码、JWT 密钥、AI Key 等开发信息。

建议：

- 提交毕业设计源码前进行脱敏
- 改为环境变量或本地专用配置文件

### 12.2 数据库不会自动初始化

虽然项目提供了 `schema.sql` 和 `data.sql`，但当前配置是 `mode: never`，因此必须手动导入脚本。

### 12.3 上传目录写死为本机 Windows 路径

如果换一台机器运行，很可能需要重新设置：

```yml
upload:
  path: 本机真实路径
```

### 12.4 项目目录中包含 `.idea`、`target`、`node_modules`

这些目录会让工程体积增大，也不适合做最终源码归档。建议正式提交时清理：

- `.idea`
- `target`
- `node_modules`

---

## 13. 结语

这个项目整体上已经具备一个本科毕业设计所需要的完整性：

- 有明确的业务场景
- 有可运行的前后端项目
- 有数据库设计
- 有用户端和后台端
- 有订单、评价、售后、推荐、AI 等亮点模块

如果你后续要继续完善毕业设计文档，可以直接在本 README 的基础上拆分成：

- 系统总体设计
- 功能模块设计
- 数据库设计
- 系统实现
- 系统测试

---

## 14. 快速启动命令汇总

### 后端

```bash
cd pants-mall-backend/mall
mvn spring-boot:run
```

### 前端

```bash
cd pants-mall-frontend
npm install
npm run dev
```

### Swagger

```text
http://localhost:8081/swagger-ui/index.html
```

### 前端首页

```text
http://localhost:5173
```

