# InterviewManager 测试方案

## 1. 测试概述

### 1.1 测试目标

验证 InterviewManager 项目所有功能模块的正确性、稳定性和安全性。

### 1.2 测试范围

| 模块 | 测试内容 | 优先级 |
|------|----------|:------:|
| 桌面版 API | CRUD操作、数据持久化、导入导出 | P0 |
| 网页版 API | CRUD操作、数据隔离、导入导出 | P0 |
| 认证系统 | 注册、登录、Token验证、安全 | P0 |
| 共享组件 | 统计逻辑、阶段流转、UI交互 | P1 |
| Electron | 窗口管理、托盘、IPC | P1 |
| 官网 | 页面加载、导航、链接 | P2 |

### 1.3 测试环境

- 操作系统：Windows 11
- Node.js：v18+
- 包管理器：pnpm
- 数据库：SQLite（网页版）
- 测试工具：curl、vitest

---

## 2. 桌面版测试用例

### 2.1 API 测试

#### TC-D-001: 健康检查

| 项目 | 内容 |
|------|------|
| 前置条件 | 服务器运行在端口3001 |
| 测试步骤 | `GET /api/interviews/health` |
| 预期结果 | 200 OK，返回 `{ count: number, timestamp: string }` |

#### TC-D-002: 获取面试列表

| 项目 | 内容 |
|------|------|
| 前置条件 | 无数据 |
| 测试步骤 | `GET /api/interviews` |
| 预期结果 | 200 OK，返回 `[]` |

#### TC-D-003: 创建面试记录

| 项目 | 内容 |
|------|------|
| 测试步骤 | `POST /api/interviews` body: `{ "company": "腾讯", "position": "前端工程师" }` |
| 预期结果 | 201 Created，返回完整记录含 id、stages、createdAt |

#### TC-D-004: 创建记录 - 参数校验

| 项目 | 内容 |
|------|------|
| 测试步骤 | `POST /api/interviews` body: `{ "company": "", "position": "test" }` |
| 预期结果 | 400 Bad Request |

#### TC-D-005: 更新记录

| 项目 | 内容 |
|------|------|
| 前置条件 | 存在 id 为 xxx 的记录 |
| 测试步骤 | `PATCH /api/interviews/:id` body: `{ "company": "阿里", "position": "后端" }` |
| 预期结果 | 200 OK，返回更新后的记录 |

#### TC-D-006: 更新阶段状态

| 项目 | 内容 |
|------|------|
| 前置条件 | 记录存在且 stageIndex=0 为 current |
| 测试步骤 | `PATCH /api/interviews/:id/stage` body: `{ "stageIndex": 0, "status": "pass" }` |
| 预期结果 | 200 OK，stage[0] 变为 pass，stage[1] 变为 current |

#### TC-D-007: 删除记录

| 项目 | 内容 |
|------|------|
| 前置条件 | 存在 id 为 xxx 的记录 |
| 测试步骤 | `DELETE /api/interviews/:id` |
| 预期结果 | 204 No Content |

#### TC-D-008: 导入数据

| 项目 | 内容 |
|------|------|
| 测试步骤 | `POST /api/interviews/import` body: `[{ "company": "test", ... }]` |
| 预期结果 | 200 OK，导入成功 |

#### TC-D-009: 导出数据

| 项目 | 内容 |
|------|------|
| 测试步骤 | `GET /api/interviews/export` |
| 预期结果 | 200 OK，返回完整数据数组 |

### 2.2 数据持久化测试

#### TC-D-010: 原子写入

| 项目 | 内容 |
|------|------|
| 测试步骤 | 创建记录后检查 data/interviews.json |
| 预期结果 | 文件存在且包含新记录，无 .tmp 残留 |

#### TC-D-011: 并发写入串行化

| 项目 | 内容 |
|------|------|
| 测试步骤 | 同时发送3个创建请求 |
| 预期结果 | 所有记录都成功创建，无数据覆盖 |

---

## 3. 网页版测试用例

### 3.1 认证测试

#### TC-W-001: 用户注册

| 项目 | 内容 |
|------|------|
| 测试步骤 | `POST /api/auth/register` body: `{ "username": "testuser", "password": "123456" }` |
| 预期结果 | 201 Created，返回用户信息（不含密码） |

#### TC-W-002: 注册 - 用户名重复

| 项目 | 内容 |
|------|------|
| 前置条件 | 用户 testuser 已存在 |
| 测试步骤 | `POST /api/auth/register` body: `{ "username": "testuser", "password": "123456" }` |
| 预期结果 | 409 Conflict |

#### TC-W-003: 注册 - 参数校验

| 项目 | 内容 |
|------|------|
| 测试步骤 | `POST /api/auth/register` body: `{ "username": "ab", "password": "123" }` |
| 预期结果 | 400 Bad Request（用户名<3，密码<6） |

#### TC-W-004: 用户登录

| 项目 | 内容 |
|------|------|
| 测试步骤 | `POST /api/auth/login` body: `{ "username": "testuser", "password": "123456" }` |
| 预期结果 | 200 OK，返回 `{ token: "xxx", user: { id, username } }` |

#### TC-W-005: 登录 - 密码错误

| 项目 | 内容 |
|------|------|
| 测试步骤 | `POST /api/auth/login` body: `{ "username": "testuser", "password": "wrong" }` |
| 预期结果 | 401 Unauthorized |

#### TC-W-006: Token 验证

| 项目 | 内容 |
|------|------|
| 前置条件 | 已登录获取 token |
| 测试步骤 | `GET /api/auth/me` Header: `Authorization: Bearer <token>` |
| 预期结果 | 200 OK，返回用户信息 |

#### TC-W-007: Token 验证 - 无Token

| 项目 | 内容 |
|------|------|
| 测试步骤 | `GET /api/auth/me`（无Authorization头） |
| 预期结果 | 401 Unauthorized |

### 3.2 数据隔离测试

#### TC-W-008: 用户数据隔离

| 项目 | 内容 |
|------|------|
| 前置条件 | 用户A和用户B各有数据 |
| 测试步骤 | 用户A请求 `GET /api/interviews` |
| 预期结果 | 仅返回用户A的数据 |

#### TC-W-009: 跨用户操作拦截

| 项目 | 内容 |
|------|------|
| 前置条件 | 记录属于用户B |
| 测试步骤 | 用户A请求 `DELETE /api/interviews/:id` |
| 预期结果 | 404 Not Found（不泄露存在性） |

### 3.3 导入模式测试

#### TC-W-010: 合并模式导入

| 项目 | 内容 |
|------|------|
| 前置条件 | 用户已有2条记录 |
| 测试步骤 | `POST /api/interviews/import` body: `{ "data": [...], "mode": "merge" }` |
| 预期结果 | 保留原有2条，新增导入的记录 |

#### TC-W-011: 覆盖模式导入

| 项目 | 内容 |
|------|------|
| 前置条件 | 用户已有2条记录 |
| 测试步骤 | `POST /api/interviews/import` body: `{ "data": [...], "mode": "overwrite" }` |
| 预期结果 | 原有2条被删除，仅保留导入的数据 |

---

## 4. 共享组件测试

### 4.1 统计面板逻辑

#### TC-S-001: 投递总数计算

| 项目 | 内容 |
|------|------|
| 输入 | 5条面试记录 |
| 预期结果 | 投递总数 = 5 |

#### TC-S-002: 进行中统计

| 项目 | 内容 |
|------|------|
| 输入 | 记录A有current阶段，记录B为pass到offer |
| 预期结果 | 进行中 = 1 |

#### TC-S-003: 面试转化率

| 项目 | 内容 |
|------|------|
| 输入 | 10条记录，其中4条在一面及之后有pass/current |
| 预期结果 | 转化率 = 40% |

### 4.2 阶段流转逻辑

#### TC-S-004: Pass自动推进

| 项目 | 内容 |
|------|------|
| 前置条件 | stage[0]=current |
| 操作 | 将 stage[0] 设为 pass |
| 预期结果 | stage[0]=pass, stage[1]=current |

#### TC-S-005: Fail终止流程

| 项目 | 内容 |
|------|------|
| 前置条件 | stage[2]=current |
| 操作 | 将 stage[2] 设为 fail |
| 预期结果 | stage[2]=fail，后续阶段保持 pending |

#### TC-S-006: Skip自动推进

| 项目 | 内容 |
|------|------|
| 前置条件 | stage[3]=current |
| 操作 | 将 stage[3] 设为 skip |
| 预期结果 | stage[3]=skip, stage[4]=current |

---

## 5. 测试执行计划

| 阶段 | 内容 | 时间 |
|------|------|------|
| 1 | 启动服务器，执行API测试 | 30分钟 |
| 2 | 执行认证和数据隔离测试 | 20分钟 |
| 3 | 执行统计和阶段流转测试 | 15分钟 |
| 4 | 生成测试报告 | 15分钟 |

---

## 6. 测试报告模板

### 6.1 执行摘要

| 指标 | 数值 |
|------|------|
| 总用例数 | - |
| 通过数 | - |
| 失败数 | - |
| 跳过数 | - |
| 通过率 | - |

### 6.2 详细结果

（测试执行后填充）
