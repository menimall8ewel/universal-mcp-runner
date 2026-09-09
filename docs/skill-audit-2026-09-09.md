# Skill 优化与复审报告

日期：2026-09-09  
基线提交：850ddbe3399c2b535de0e0c793ff6bc4e6c3e64c  
新版：1.1.0；具体提交以本报告所在 Git 提交为准。

## 结论

已修正规则歧义并完成文件级检查、静态场景复审；没有发现本轮检查范围内尚未处理的规则冲突。未完成 OpenHands 实际加载、真实 Agent 行为对比或生产测试，不能据此声称运行零故障或准确率提高。

## 已完成的优化

| 原问题 | 修正 | 复审结论 |
| --- | --- | --- |
| 目录可见不等于全文加载 | 根目录 AGENTS.md 仅负责指向唯一正文；Skill 增加官方支持的明确触发词、正文版本及来源核验说明 | 入口路径存在，规则明确；真实触发待验 |
| 故障时启动搜索可能延误恢复 | 第 8 节优先核实影响、恢复依据及兼容性，最小恢复后验证并补查全球实践 | 紧急分支优先级明确；普通任务启动检索保留 |
| 外部并发修改可能被覆盖 | 写入/回退前重查版本，优先条件写入；冲突重新比较，禁止强制覆盖；无原子能力时说明竞态 | 已覆盖他人/平台变化，未声称只靠重读消除竞争 |
| 测试顺序不一致 | 分离上线前模块/契约/集成/回归与上线后版本/健康/核心路径/对账 | 无两种顺序争夺同一阶段 |
| 只读任务误套生产完成标准 | 按检查、方案、实施、发布、恢复定义交付 | 只读/方案任务不写入或部署 |
| 重复要求与上下文负担 | 合并选型、系统取舍、复用及重复原则；保留 26 个原参考链接 | 正文从 17,564 降到 15,907 字符，约减少 9.4%（含换行） |
| 缺少可重复验收材料 | 新增 tests/skill-behavior-cases.json，10 个固定场景、环境前提及可观察标准 | 用例已建立，全部标记 not_run，未伪造执行结果 |

冻结规则与 Direct Execution and Production Deployment 段逐字保留。仅一个 SKILL.md 正文；AGENTS.md 是加载指引，报告和验收用例不属于运行规则正文。插件版本由 1.0.0 更新为 1.1.0，市场位置与名称保留。

## 验证证据与范围

- 当前仓库目录清单完整返回，未截断；基线没有根目录 AGENTS.md。
- YAML 可解析，名称与父目录一致；OpenHands triggers 为两个明确字符串：software-engineering-operations、工程运维治理。
- 通用 quick_validate.py 对含 triggers 原件报“Unexpected key”，原因是其允许字段未包含 OpenHands 扩展。临时移除该扩展的基础格式检查通过；扩展按官方格式和 YAML 单独检查。这不是运行官方 OpenHands 加载器的结果。
- 10 个用例 ID 唯一，环境前提与可观察结果完整，状态均为 not_run；静态复审确认新版有对应处理分支。涉及加载、紧急恢复、只读、并发、部署超时、Secret、回退、搜索不可用和普通检索。
- 本轮没有调用 OpenHands 会话运行、模型评估或 Cloudflare 部署工具，当前可用工具中未发现 OpenHands 会话执行能力。
- 业务代码、依赖、Wrangler 配置不在本轮修改范围。仓库 README 表示 main 可能由 Workers Builds 自动发布；未读取 Cloudflare 实际构建/部署状态，因此不承诺此次 Git 推送没有触发平台流水线。

## 尚需实际验收

1. 新建本仓库会话，核对 AGENTS.md 是否引导加载 1.1.0 全文及实际 commit。
2. 在另一个隔离测试仓库，通过已附加市场插件发送“工程运维治理”，核对触发及来源；根目录 AGENTS.md 不覆盖其他仓库。
3. 使用固定用例在隔离环境做新旧版本对比，保持模型、工具和初始状态可比；不把 expected 字段交给执行器作为答案。收集外部最终状态和工具轨迹，记录成功、失败与未执行。
4. 新会话刷新、插件版本号或格式通过都不能代替以上验收。无需新建生产平台或进行破坏性生产演练。

## 官方依据

- [OpenHands Skills Overview](https://docs.openhands.dev/overview/skills)：按需加载、根目录指引与扩展适用范围。
- [OpenHands Keyword-Triggered Skills](https://docs.openhands.dev/overview/skills/keyword)：triggers 字段格式。
- [OpenHands Skills and Plugins](https://docs.openhands.dev/enterprise/skills-and-plugins)：市场自动加载、旧会话不自动重载与实际验证。
- [Claude Code best practices](https://code.claude.com/docs/en/best-practices)：精简指引与可执行验证。

参考资料核对与静态检查不能代替真实行为评价。
