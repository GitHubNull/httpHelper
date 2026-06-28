# 贡献指南

感谢你对 http helper 的兴趣！以下是参与项目开发的指南。

## 提交 Issue

发现 Bug 或有新功能建议？请提交 Issue 并包含以下信息：

- 问题描述（期望行为 vs 实际行为）
- 复现步骤
- Chrome 版本
- 扩展版本（`manifest.json` 中的 `version`）
- 控制台错误日志（如有）

## 提交 Pull Request

### 流程

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/xxx` 或 `fix/xxx`
3. 提交代码变更
4. 确保通过手动测试清单（见 [index.md](index.md) 调试与测试章节）
5. 更新 `doc/CHANGELOG.md` 和 `doc/developer-guide/module-api.md`（如修改了 API）
6. 提交 PR，描述变更内容和动机

### 代码规范

- 遵循现有代码风格（缩进、命名、注释）
- 新增模块需同步更新 `AGENTS.md` 和 `README.md` 的项目结构
- 新增功能需同步更新 `doc/usage-guide.md`
- 避免引入新的外部依赖（如需引入，通过 `pnpm add` 安装并在 `main.ts` 或对应组件中导入）

### 测试要求

- [ ] 扩展正常加载，无控制台报错
- [ ] 手动测试清单全部通过
- [ ] 新功能在亮/暗主题下均正常显示
- [ ] 新功能不影响现有功能

## 代码审查

PR 将由维护者审查，可能要求：

- 修改代码以符合规范
- 补充文档或注释
- 调整实现方式以保持一致性

## 文档同步检查清单

提交 PR 时，请检查以下文档是否需要同步更新：

| 变更类型 | 需更新的文档 |
|----------|-------------|
| 新增/修改 Pinia store | `module-api.md` + `AGENTS.md` |
| 新增/修改 composable | `module-api.md` + `AGENTS.md` |
| 新增/修改 service | `module-api.md` + `AGENTS.md` |
| 新增/修改 utils 函数 | `module-api.md` + `AGENTS.md` |
| 新增/修改组件 | `architecture.md` 组件树 + `AGENTS.md` |
| 新增/修改类型定义 | `module-api.md` 类型定义章节 |
| 功能变更（用户可见） | `usage-guide.md` |
| 版本号变更 | `package.json` + `src/manifest.json` + `CHANGELOG.md` |

> **注意**：`AGENTS.md` 是 AI 智能体的项目指南，需与实际代码保持同步。

## 自动化发布流程

项目使用 GitHub Actions 实现自动化构建检查与发布，无需手动构建或上传产物。

### CI 构建检查

- **触发条件**：push 到 `main` 分支、提交 PR 到 `main` 分支
- **工作流文件**：[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
- **执行内容**：安装依赖（`pnpm install --frozen-lockfile`）→ 构建扩展（`pnpm build`）
- **作用**：确保提交的代码可正常构建，构建失败时阻止 PR 合并

### 自动发布

- **触发条件**：推送 `v*` 格式的 tag（如 `v2.2.1`）
- **工作流文件**：[`.github/workflows/release.yml`](../../.github/workflows/release.yml)
- **执行内容**：
  1. 构建扩展，生成 `dist/` 目录
  2. 打包为 `http-helper-vX.Y.Z.zip`
  3. 从 `doc/CHANGELOG.md` 提取对应版本的变更记录作为 Release 说明
  4. 创建 GitHub Release 并上传 zip 附件
- **权限**：工作流需 `contents: write` 权限以创建 Release

### 发布步骤

1. 确保以下文件版本号一致：
   - `package.json` 的 `version` 字段
   - `src/manifest.json` 的 `version` 字段
2. 在 `doc/CHANGELOG.md` 顶部添加新版本条目（遵循 Keep a Changelog 格式）
3. 提交变更：`git commit -m "release: vX.Y.Z"`
4. 创建并推送 tag：
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   git push origin main --follow-tags
   ```
5. GitHub Actions 将自动构建并创建 Release

> **注意**：tag 名必须以 `v` 开头（如 `v2.3.0`），否则不会触发自动发布。Release 说明从 `doc/CHANGELOG.md` 中提取，请确保 CHANGELOG 已更新。

---

## 联系方式

如有问题，欢迎通过 GitHub Issue 讨论。
