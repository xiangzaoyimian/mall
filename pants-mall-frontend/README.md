# 裤品线上交易电商系统前端（pants-mall-frontend）

## 项目简介
本项目为裤品线上交易电商系统前端，基于 React + TypeScript + Vite 开发，实现了用户端商城功能与后台管理页面。

## 技术栈
- React 19
- TypeScript 5
- Vite 7
- Axios

## 主要功能
### 用户端
- 用户注册、登录
- 裤品列表浏览
- 关键词搜索
- 商品详情查看
- 购物车管理
- 收藏管理
- 地址管理
- 订单查询与取消
- 评价管理
- 体型档案管理
- 个性化推荐

### 管理端
- 后台首页
- 分类管理
- 商品管理
- 订单管理
- 售后管理

## 运行环境
- Node.js 18+
- npm 9+

## 安装依赖
在前端项目根目录执行：

```bash
npm install
```

## 启动开发环境
```bash
npm run dev
```

默认访问地址：

```text
http://localhost:5173
```

## 后端联调说明
前端通过 Vite 代理将 `/api` 请求转发到后端：

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

因此本地联调时请确保：
- 前端运行在 `http://localhost:5173`
- 后端运行在 `http://localhost:8081`

## 图片访问说明
当前部分页面中的图片地址直接拼接为：

```text
http://localhost:8081/uploads/...
```

因此本地开发时后端地址建议保持为 `http://localhost:8081`，否则商品图片、评价图片等资源可能无法正常显示。

## 打包构建
```bash
npm run build
```

构建完成后产物位于：

```text
dist/
```

## 目录结构
```text
src
├── api                 接口封装
├── AdminApp.tsx        后台应用入口
├── App.tsx             前台应用入口
├── LoginPage.tsx       登录页
├── RegisterPage.tsx    注册页
├── PantsListPage.tsx   商品列表页
├── ProductDetailPage.tsx 商品详情页
├── CartPage.tsx        购物车页
├── OrdersPage.tsx      订单页
├── FavoritesPage.tsx   收藏页
├── AddressPage.tsx     地址管理页
├── BodyProfilePage.tsx 体型档案页
├── RecommendPage.tsx   推荐页
├── SearchResultPage.tsx 搜索结果页
├── UserProfilePage.tsx 用户信息页
├── AdminHomePage.tsx   后台首页
├── AdminCategoryPage.tsx 后台分类管理
├── AdminProductPage.tsx 后台商品管理
├── AdminOrdersPage.tsx 后台订单管理
└── AdminAfterSalePage.tsx 后台售后管理
```

## 启动步骤建议
1. 先启动 MySQL，并确保后端数据库可正常连接。
2. 启动后端服务：`http://localhost:8081`
3. 再启动前端服务：`http://localhost:5173`
4. 浏览器访问前端首页进行测试。

## 默认测试账号
### 管理员
- 用户名：admin
- 密码：123456

### 普通用户
普通用户可通过注册页面自行注册。

## 开发说明
- 请求封装位于 `src/api/client.ts`，默认基于 `/api` 发起请求。
- 登录成功后 token 会保存在 `localStorage` 中。
- 若出现 401/403，前端会自动清理失效登录信息。

## 注意事项
- 若需要部署到非 `localhost:8081` 的后端地址，需要同步调整 Vite 代理配置，以及页面中对图片地址的拼接逻辑。
- 当前 README 说明基于本地开发环境整理，适合课程设计 / 毕业设计演示使用。
