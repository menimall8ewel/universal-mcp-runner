# OpenHands 治理规则自动加载与验收（1.2.5）

## 生效配置
权威分发源：`https://github.com/menimall8ewel/universal-mcp-runner`，分支 `main`，市场仓库路径 `.agents`，个人作用域，Auto-Load 开启并保存，技能保持启用。master 同步本次修复用于消除旧分支误导；后续维护以 main 为准，只注册一个来源，不同时附加两个分支。
市场清单：`.agents/.plugin/marketplace.json`；插件清单：`.agents/.plugin/plugin.json`；唯一规则正文：`.agents/skills/software-engineering-operations.md`。
市场注册可使用任意受支持仓库名，不要求将本仓库改名为 .agents。名为 .agents 的专用用户配置仓库是另一种分发方式。
规则采用 Legacy .md，无触发条件；成功加载到初始系统提示词后，全文随系统消息参与后续调用。无需用户每次提示加载，不依赖 invoke_skill。打开空白网页不等于服务端已初始化会话；以实际 SystemPromptEvent 为准。已运行会话不会因 Git 更新自动替换旧规则。

## 持续保留
使用部署版本支持的原生压缩配置，保留包含治理全文的初始系统消息。官方 LLMSummarizingCondenser 的 keep_first 保留开头事件，具体值须根据实际事件顺序核验，不把本文当成已设置该参数。恢复会话后也检查实际发给模型的系统消息。
不要用重复注入、循环提示或禁用压缩来代替验证。不修改 OpenHands 核心。若发现正文缺失可补读恢复，但补读不算自动加载成功。常驻上下文不等于模型绝对遵守，也不提供后台运行或跨会话业务记忆。
文件大小不能换算成固定 token 数。用实际模型 tokenizer 或请求 usage 计量完整请求（系统、工具、历史和正文），按服务商实际输入限制留余量；旧的 164612 > 163840 报错仅证明当次请求超限，不能证明系统因 Skill 大而自动跳过。

## 验收
当前：仓库格式、规则保留与分发结构静态核验通过；真实 OpenHands 新会话、压缩和恢复测试未执行。不得标为生产验收通过。
1. 记录 OpenHands/SDK 版本、市场配置、实际 resolved commit、规则文件 SHA；确认只有一个正文入口。
2. 新建目标作用域会话，不在用户消息中给出标识答案，不调用工具或补读文件。检查初始 SystemPromptEvent 的 REPO_CONTEXT 与该提交正文一致且只出现一次。模型回答标识仅作辅助，不能替代全文证据。
3. 可发送：“禁止使用任何工具或读取文件；仅根据初始上下文回答 GOVERNANCE_AUTOLOAD_MARKER 的值，不存在则回答 NOT_LOADED。”验收者独立从目标提交读取期望值，不将答案发给受测模型。会话 ID 不是标识值。
4. 在无生产副作用的测试会话进行多轮、实际原生压缩及会话恢复。分别核验发给模型的系统消息仍含同一正文；记录轨迹与实际 token 占用。没有发生压缩不能标压缩测试通过。
5. 普通工程请求不提 Skill 名，检查只读范围、证据核验及发布条件等代表性行为。关闭加载的隔离对照会话应不含正文。不要向生产注入故障、压力或测试写入。
6. 记录通过、失败、未执行及其证据。只有来源、启动全文、后续保留、压缩恢复和上下文容量均验证后，才能宣称本实例达到要求。

## 官方依据（2026-09-11 核对）
- https://docs.openhands.dev/sdk/guides/skill#skill-injection-behavior
- https://docs.openhands.dev/enterprise/skills-and-plugins#configure-auto-load
- https://docs.openhands.dev/sdk/guides/plugins
- https://docs.openhands.dev/sdk/guides/context-condenser
