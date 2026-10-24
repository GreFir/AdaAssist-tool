# AdaAssist · 中文安装与快速上手

[English README](../README.md) · [下载 VSIX](https://github.com/GreFir/AdaAssist-tool/releases) · [Issues](https://github.com/GreFir/AdaAssist-tool/issues)

**AdaAssist** 是面向 Python 代码生成研究的 VS Code 插件。它把“需求 → 测试 → 生成 → 验证 → 修复”过程展示出来，同时提供 **Interactive（交互）** 和 **Auto（自动）** 两种运行模式。

## 论文实验配置与复现

**配置目录：[`reproduction/configs/`](../reproduction/configs/)**；最终设计、参数和复现步骤见[中文实验说明](../reproduction/README.zh-CN.md)。

| 论文实验 | 最终配置 |
| --- | --- |
| III-A / 表 I | [DeepSeek 三规模、五方法对比](../reproduction/configs/deepseek.json) |
| III-B / 表 II | [Qwen 三工具对比与最终结果](../reproduction/configs/qwen.json) |
| III-C / 表 III | [9 人、20 题受控干预](../reproduction/configs/intervention.json)，每题重新开始、无任务总时限 |
| III-D / 表 IV | [15 人三工具用户研究](../reproduction/configs/user-study.json)，[固定 8 题](../reproduction/artifacts/datasets/task_ids_user_study8.json)为 4 题 HumanEval 简单题与 4 题 BCB 困难题，每组一个工具，全部结束后整体评分 |

后端所有方法统一 **T=0.2、top-p=0.9、最大输出 512 tokens、seeds 42/43/44**；重试使用**工具默认设置**。数据为 HumanEval 164、MBPP 500、BCB Random150。任务名单和测试划分见[数据目录](../reproduction/artifacts/datasets/)，研究操作流程见[STUDY_PROTOCOLS.md](../reproduction/STUDY_PROTOCOLS.md)。

**方法配置：**MapCoder 采用官方默认配置；AdaAssist 采用后端 Auto 默认工作流，公开测试通过或达到配置的修复轮数上限时结束，用户中断时暂停。

## 1. 最便捷的安装方式：VSIX

**普通用户不需要下载源代码，也不用安装 Node.js/npm。**

1. 打开 [GitHub Releases](https://github.com/GreFir/AdaAssist-tool/releases)，在最新版本的 **Assets** 里下载 `adaassist-*.vsix`。
2. 打开 VS Code，按 `Ctrl+Shift+X` 进入扩展页面，点击右上角 **··· → 从 VSIX 安装…（Install from VSIX…）**。
3. 选择下载的 VSIX；需要时重新加载 VS Code。左侧活动栏会出现 **AdaAssist**。

命令行安装也可以：

```powershell
code --install-extension .\adaassist-1.0.0.vsix
```

把文件名换成实际下载的版本。**手动安装的 VSIX 默认不会自动升级**，以后更新时重新安装新版本即可。

**如果 Releases 下载遇到问题：** 可以在 [VSIX 构建工作流](https://github.com/GreFir/AdaAssist-tool/actions/workflows/package-vsix.yml) 的成功运行记录中下载 **Artifacts → adaassist-vsix**，解压后得到 VSIX（下载 Actions 产物可能需要 GitHub 登录）。开发者也可以参照 [源码打包](DEVELOPMENT.md) 自己生成。

## 2. 首次使用还需要准备什么？

VSIX 内含插件界面和 Python 后端**源码**，但不包含 Python 本体、模型权重或商业 API Key。因此首次运行需要准备：

- **VS Code 1.110.0 或更新版本**
- **Python 3.12 或更高版本**，以及 AdaAssist 运行依赖
- 可以访问的 **OpenAI / Claude / Ollama / vLLM 等模型接口**

已有 Python 环境且装过依赖的话，这一步可以跳过。否则在该 Python 环境运行一次：

```powershell
python -m pip install fastapi uvicorn openai requests anthropic google-genai
```

如果 Windows 的 `python` 不是 3.12，可以用 `py -3.12 -m pip ...`。如果你希望隔离依赖，建议新建 venv/Conda 环境，详见 [Python 环境设置](INSTALLATION.md#python-runtime-setup)。

接着进入 **AdaAssist → Settings → Environment**：

1. 点击 **Select Python Interpreter**，选择刚刚安装依赖的 Python 环境（可选 Conda、venv 或本机 Python）。
2. 点击 **Check Environment** 检查后端依赖。
3. AdaAssist 会保存所选 Python 解释器路径和启动参数，下次打开同一工作区不必重新选择。
4. AdaAssist 会在需要时自动启动本地 FastAPI 服务，通常不需要你手动打开终端运行 `main.py`。

**注意：** Python 依赖一定要安装到 AdaAssist 选用的解释器里；安装到 A 环境、却选择 B 环境，是最常见的启动失败原因。

## 3. 配置模型并开始第一个任务

在 **Settings → Models** 新建模型配置。新安装时，**模型地址和模型名称均默认留空**，需要自行配置：

| 配置 | 示例 | 备注 |
| --- | --- | --- |
| Provider | `vllm`、`ollama` 或 `openai` | 根据你的服务选择 |
| Base URL | 你自己的模型服务地址 | 默认留空；根据实际部署填写 |
| Model | 你的模型 ID | 必须与服务返回的模型名称一致 |
| API Key | 按服务要求填写 | 通过设置界面保存密钥，避免提交到 GitHub |
| Max Output Tokens | `4096` | 设置代码、测试与修复规划的输出长度上限 |

点击 **Save Profile** 保存。行内补全默认关闭，在 **Settings → Completion** 中填写独立的模型地址和模型名称后即可启用。重新安装修正后的 v1.0.0 不会删除旧工作区配置；如果仍显示旧地址，请在已保存的模型配置中自行清除。

接下来在主界面：

1. 发送按钮左侧选择 **Interactive** 或 **Auto**。
2. 输入需求，按需要打开 **Tests** 粘贴公开测试。
3. 点击发送。Interactive 会在关键步骤等待用户确认；Auto 会自动推进工作流。

例如输入：

```text
请实现 def unique_sorted(values: list[int]) -> list[int]:
去重并升序排列整数列表，正确处理空列表与负数。
```

可以配合：

```python
assert unique_sorted([]) == []
assert unique_sorted([3, 1, 3, 2]) == [1, 2, 3]
assert unique_sorted([-1, -1, 0]) == [-1, 0]
```

**公开测试通过不等于证明程序对所有边界输入正确。** 可以继续补充测试、细化要求，或确认任务完成并开始新的 Session。

## 4. 常见问题

**Q：VSIX 装完就能用吗？**

插件界面可以直接安装使用，但生成代码仍需要 Python 后端依赖和可访问的模型服务。VSIX 不会自动安装这些大型外部运行组件。

**Q：为什么会提示找不到 Python 或缺少 FastAPI？**

检查 Settings → Environment 中实际选择的解释器，确保它可以运行：

```powershell
python -c "import fastapi, uvicorn, openai, requests; print('AdaAssist backend OK')"
```

这里的 `python` 必须是那个环境的解释器。用其他环境执行这个命令可能产生误判。

**Q：本地模型连接失败怎么办？**

确认模型服务正在运行，Base URL、模型名和 Provider 对应正确。Ollama 通常是 `http://localhost:11434/v1`；vLLM 要用你启动服务时配置的地址。必要时打开 AdaAssist 的 **Logs** 和 VS Code **Output** 查看详细错误。

**Q：安装升级 VSIX 会清空任务吗？**

会话恢复依赖工作区存储、历史快照及当前后端状态。正常升级不会主动删除这些数据，但建议对重要实验或任务备份工作区与研究日志。部分只有摘要的旧日志无法完整恢复。

**Q：为什么提示 768 或 1024 Tokens 截断？**

检查当前 Profile 的 **Max Output Tokens** 并保存，再确认活动 Session 和后台服务确实使用了新配置。输出上限与模型上下文窗口是两个不同概念。

**Q：插件如何更新？**

打开 [Releases](https://github.com/GreFir/AdaAssist-tool/releases) 下载新版本 VSIX，重新安装即可。通过 VSIX 安装的插件默认不自动更新。

## 更多文档

- [英文完整 README](../README.md)
- [依赖、安装与高级排查](INSTALLATION.md)
- [源码编译与 VSIX 打包](DEVELOPMENT.md)
- [研究日志与实验复现](RESEARCH.md)

**安全提醒：** AdaAssist 会执行 Python 测试代码。不要在存放敏感数据的环境中运行不可信测试或模型生成代码；重要任务应使用隔离环境。
