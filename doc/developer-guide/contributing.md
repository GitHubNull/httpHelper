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
- 避免引入新的外部依赖（如需引入，放入 `src/third_lib/`）

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

## 联系方式

如有问题，欢迎通过 GitHub Issue 讨论。
