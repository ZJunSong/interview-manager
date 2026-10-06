# 贡献指南

感谢关注 InterviewManager！欢迎以任何形式参与贡献：报告问题、提出建议、改进文档或提交代码。

## 提交 Issue

- **Bug 报告**请附上：复现步骤、期望行为与实际行为、浏览器/部署方式（本地 Node 或 Docker）
- **功能建议**请说明使用场景，越具体越容易被采纳

## 提交代码

1. Fork 仓库并创建特性分支：`git checkout -b feat/your-feature`
2. 开发前请先跑通现有测试：`pnpm test`
3. 提交前确保：`pnpm test` 全绿、`pnpm build` 通过
4. 提交信息使用中文，格式参考：`feat: xxx` / `fix: xxx` / `refactor: xxx`
5. 发起 Pull Request，描述清楚改了什么、为什么

## 代码约定

- 服务端 SQL 字符串字面量一律使用单引号（better-sqlite3 编译期禁用双引号字符串）
- 前端样式使用 `src/assets/styles/global.css` 中的设计令牌（CSS 变量），不引入体系外硬编码颜色
- 涉及排序/分组逻辑的改动请同步补充 `tests/grouping.test.ts` 用例
- 涉及接口的改动请同步补充 `tests/server.api.test.ts` 用例
