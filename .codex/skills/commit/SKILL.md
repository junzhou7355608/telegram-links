---
name: commit
description: 按当前项目的提交规范创建本地 git commit。当用户要求 commit、提交、make a commit、拆分提交，或把当前项目改动整理为一个或多个 Conventional Commits 时使用。
---

# 提交

## 工作流程

仅在当前项目中创建本地 git commit 时使用本技能。除非用户明确提出对应的单独操作，否则使用本技能时不要编辑、格式化、恢复、回滚、推送、拉取或上传代码。

1. 暂存前先检查仓库状态：
   - `git status --short`
   - `git diff --staged --stat`
   - `git diff --staged`
   - `git diff --stat`
   - `git diff`
   - `git log -5 --oneline`

2. 提交前按意图归类全部改动：
   - 将无关模块或无关类型的改动放在不同提交中。
   - 只有当改动共享同一个目的时，才优先使用一个提交。
   - 如果存在未跟踪文件，暂存前先检查其内容。
   - 永远不要暂存明显的密钥或仅限本地的文件，例如 `.env`、私钥、凭据、令牌或已忽略的生成目录。
   - 不要暂存当前提交组之外的文件。

3. 有意识地暂存：
   - 优先使用明确的路径规格或按 hunk 暂存，而不是 `git add .`。
   - 保留已经暂存的改动，除非检查后确认它们不属于下一个提交组。
   - 如果已暂存和未暂存改动混在一起，只提交意图一致的一组，保持无关改动不变。

4. 按以下精确格式编写提交信息：
   - `type(scope): subject`
   - `scope` 必填；优先使用 workspace、package 或模块名，例如 `server`、`admin`、`miniapp`、`api`、`hooks`、`utils`、`ci` 或 `docs`。
   - 合法类型：`feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`build`、`ci`、`chore`、`revert`。
   - `subject` 必须使用简体中文，并描述改动目的。
   - header 控制在 100 个字符以内。

5. 提交并验证每组改动：
   - 运行 `git commit -m "<message>"`。
   - 每次提交后，运行 `git status --short`。
   - 只有当剩余改动明确属于后续提交组时，才继续。
   - 不要创建空提交；如果没有可提交内容，如实说明。

## 最终回复

报告每个已创建的提交，格式为 `<hash> <message>`。说明所有剩余未提交文件，以及它们被保留的原因。
