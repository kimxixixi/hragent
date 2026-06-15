# 培小评 — 员工培训心得评价 Agent

纯对话式 AI Agent，员工提交培训心得后自动评价反馈，低分异常通知 HR 复核。

---

## 一、项目概览

### 解决什么问题

企业培训后，员工提交心得 → HR/培训师逐条人工点评，费时费力且标准不一。培小评将这个过程自动化：

- 员工直接与 Agent 对话，粘贴心得即可获得多维度评价
- 高质量心得自动反馈，低质量心得通知 HR 介入
- HR 仅处理异常，日常操作量为零

### 核心流程

```
员工打开页面
  │
  ├─ 报到：输入姓名+工号（如"张三 S001"）
  │
  └─ 提交心得
       │
       ├─ ≥ 5 分 → 直接展示完整评价卡片（分数 + 5维度详情 + 建议）
       │
       └─ < 5 分 → 员工看到 "HR 复核中"
                     │
                     ├─ HR 收到邮件通知（含姓名+工号+得分+详情）
                     ├─ HR 在面板中审核
                     │    ├─ 直接通过 → 员工看到 AI 评价卡片
                     │    └─ 驳回编辑 → HR 基于模板写反馈 → 员工看到
                     └─ 员工收到最终反馈
```

---

## 二、技术架构

```
┌──────────────────────────────────────┐
│  前端 (React + Vite + TypeScript)     │
│  - ChatView 对话界面                   │
│  - EvaluationCard 评价卡片             │
│  - HRPanel 异常复核面板                │
│  - SSE 流式接收评价进度                │
└──────────┬───────────────────────────┘
           │ HTTP + SSE
┌──────────▼───────────────────────────┐
│  后端 (Express + TypeScript)          │
│  - Agent 引擎（Prompt + 评价编排）      │
│  - 语气调节引擎                        │
│  - 安全过滤器（红线保护）               │
│  - 通知服务（邮件 / 企微）              │
│  - SQLite 数据持久化                   │
└──────────┬───────────────────────────┘
           │ OpenAI 兼容 API
┌──────────▼───────────────────────────┐
│  LLM 模型层                            │
│  默认: 阿里云 DashScope (qwen-max)     │
│  兼容: DeepSeek / OpenAI / 任意兼容接口 │
└──────────────────────────────────────┘
```

---

## 三、快速启动

### 环境要求

- Node.js ≥ 18
- npm ≥ 9

### 1. 安装依赖

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. 配置

编辑 `backend\.env`：

```env
# 必填：LLM API Key 和模型
LLM_API_KEY=sk-xxxxxxxx
LLM_MODEL=qwen-max
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# 必填：HR 异常通知邮箱
NOTIFY_EMAIL=你的QQ号@qq.com
NOTIFY_EMAIL_PASS=QQ邮箱SMTP授权码

# 可选：服务端口
PORT=3001
```

> QQ 邮箱 SMTP 授权码获取：QQ邮箱 → 设置 → 账户 → POP3/SMTP服务 → 开启

### 3. 启动

```bash
# 后端（先启动）
双击 start-backend.cmd

# 前端（再启动）
双击 start-frontend.cmd
```

浏览器访问 `http://localhost:5173`

---

## 四、使用指南

### 员工端

1. 打开页面，看到培小评的欢迎消息
2. **先报到**：输入"姓名 工号"（如 `张三 S001`），培小评确认记住
3. 粘贴培训心得（或上传 .docx / .txt / .md 文件）
4. 等待几秒，收到评价反馈
5. 如果得分 ≥ 5 分：直接看到完整评价卡片（分数、5 维度详情、建议）
6. 如果得分 < 5 分：看到"HR 复核中"，等待 HR 审核后收到最终反馈

### HR 端

1. 评分 < 5 分时，HR 的 QQ 邮箱收到通知
2. 打开页面，点击右上角 🔔 铃铛
3. 查看异常列表，看到员工姓名、工号、得分、系统建议反馈
4. 操作：
   - **直接通过**：AI 评价卡片出现在员工聊天中
   - **驳回并编辑**：展开编辑框（预填评价模板），HR 撰写自定义反馈 → 发送给员工

### 文件上传

支持的格式：

| 格式 | 解析方式 |
|------|----------|
| `.txt` `.md` | 浏览器读取 |
| `.docx` | mammoth 前端解析 |
| `.xlsx` `.csv` | 文本读取 |

支持多篇批量：用 `---` 分隔每篇心得，标记学员姓名和培训主题：

```
学员：张三
培训：沟通技巧
今天参加了沟通培训，学到了倾听三层次...

---
学员：李四
培训：项目管理
项目管理培训让我对WBS有了新的认识...
```

---

## 五、评价体系

### 评分维度（0-10 分制，加权计算）

| 维度 | 权重 | 说明 |
|------|------|------|
| 内容完整性 | 30% | 是否复述了培训中的具体知识点或模型 |
| 理解深度 | 25% | 是否有自己的解读、质疑或延伸思考 |
| 实践结合 | 25% | 是否有具体场景 + 可执行的行动步骤 |
| 表达结构 | 10% | 逻辑是否清晰，结构是否合理 |
| 反思深度 | 10% | 是否指出了自己过去的不足或思维转变 |

### 评分标尺

| 分数段 | 典型特征 |
|--------|----------|
| 8-10 | 复述了 2+ 个知识点 + 有个人反思 + 可操作的行动计划 |
| 5-7 | 提到了一些培训内容，有简单反思，但缺具体行动 |
| 2-4 | 只有笼统感受，无具体内容、无反思、无行动 |
| 0-1 | 仅一句话表态 |

### 语气级别

| 级别 | 触发条件 | 反馈风格 |
|------|----------|----------|
| celebratory | ≥ 8 分 | 真诚赞美 + 1 条进阶建议 |
| sandwich | 5-7 分 | 肯定亮点 → 指出可提升处 → 鼓励 |
| gentle_redirect | < 5 分 | 温和引导，给出具体补充方向 |

---

## 六、配置参考

### `.env` 完整配置项

```env
# LLM
LLM_API_KEY=sk-xxxxxxxx          # API Key（必填）
LLM_MODEL=qwen-max               # 模型名
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# 通知
NOTIFY_EMAIL=xxx@qq.com          # 接收通知的邮箱
NOTIFY_EMAIL_PASS=xxxxxxxx       # QQ邮箱 SMTP 授权码

# 服务
PORT=3001

# 备用通知渠道
PUSHPLUS_TOKEN=                  # PushPlus token（备选）
SERVERCHAN_KEY=                  # Server酱 SendKey（备选）
WECOM_WEBHOOK_URL=               # 企业微信机器人 Webhook（备选）
```

### 切换模型

```env
# 千问
LLM_MODEL=qwen-max
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# DeepSeek
LLM_MODEL=deepseek-chat
LLM_BASE_URL=https://api.deepseek.com/v1

# OpenAI
LLM_MODEL=gpt-4o
LLM_BASE_URL=https://api.openai.com/v1
```

---

## 七、项目结构

```
d:\hr\agent\
├── README.md                     # 本文档
├── 1.md                          # 原始需求讨论
├── start-backend.cmd             # 后端启动脚本
├── start-frontend.cmd            # 前端启动脚本
│
├── backend/
│   ├── .env                      # 环境配置（API Key / 邮箱等）
│   ├── .env.example              # 配置模板
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts              # Express 入口
│       ├── agent/
│       │   ├── prompt.ts         # ⭐ System Prompt（评价的核心）
│       │   ├── evaluator.ts      # 评价编排 + LLM 调用
│       │   ├── toneEngine.ts     # 语气调节规则
│       │   ├── safetyFilter.ts   # 红线保护
│       │   └── uuid.ts           # UUID 工具
│       ├── routes/
│       │   ├── chat.ts           # 对话 API
│       │   ├── evaluate.ts       # 评价 API (SSE)
│       │   ├── exceptions.ts     # 异常管理 API
│       │   └── upload.ts         # 文件上传 API
│       ├── services/
│       │   └── notify.ts         # 邮件/微信通知服务
│       ├── db/
│       │   ├── schema.ts         # SQLite 表结构
│       │   └── queries.ts        # 数据库操作
│       ├── knowledge/
│       │   ├── templates.ts      # 评价模板库
│       │   └── competency.ts     # 岗位能力模型
│       ├── fixtures/
│       │   └── sample-reflections.ts  # 模拟测试数据
│       ├── demo.ts               # 命令行测试脚本
│       └── types/index.ts        # TypeScript 类型定义
│
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   └── src/
│       ├── main.tsx / App.tsx
│       ├── components/
│       │   ├── ChatView.tsx      # 对话主界面
│       │   ├── MessageList.tsx   # 消息列表
│       │   ├── InputArea.tsx     # 输入框 + 文件上传
│       │   ├── FileUploader.tsx  # 文件上传（支持 docx）
│       │   ├── HRPanel.tsx       # HR 异常复核面板
│       │   └── messages/
│       │       ├── TextMessage.tsx
│       │       ├── EvaluationCard.tsx   # 评价结果卡片
│       │       ├── ExceptionCard.tsx    # 异常卡片
│       │       └── ProgressMessage.tsx  # 进度消息
│       ├── hooks/
│       │   └── useChat.ts        # 对话状态管理
│       ├── services/
│       │   └── api.ts            # API 调用 + SSE
│       ├── types/chat.ts         # 前端类型
│       └── index.css             # 全局样式
```

---

## 八、API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/health` | 健康检查 |
| `POST` | `/api/chat` | 对话交互（含自然语言意图识别） |
| `POST` | `/api/evaluate` | 批量评价（SSE 流式返回进度） |
| `POST` | `/api/evaluate/single` | 单篇评价 |
| `GET` | `/api/exceptions?status=pending` | 获取异常列表 |
| `PUT` | `/api/exceptions/:id` | 处理异常 `{action, modifiedFeedback?}` |
| `POST` | `/api/upload/docx` | 上传 Word 文档解析 |
| `POST` | `/api/upload/text` | 上传文本文件 |

---

## 九、自定义

### 调整评价风格

编辑 `backend\src\agent\prompt.ts`，修改 `SYSTEM_PROMPT` 常量。改完自动热重载。

关键可调项：
- 评分标尺的分数段定义
- 各维度权重
- 语气调节规则
- 红线禁用词列表

### 调整异常阈值

编辑 `backend\src\agent\toneEngine.ts`，修改 `shouldFlagException` 中的分数阈值。

### 切换通知方式

编辑 `backend\src\services\notify.ts`，或通过 `.env` 切换。

---

## 十、命令行测试

无需启动前端，直接在命令行测试评价：

```bash
cd backend
npx tsx src/demo.ts
```

---

## 十一、常见问题

**Q: PowerShell 运行 npm 报错"禁止运行脚本"？**
A: 用 `cmd.exe` 运行，或直接双击 `.cmd` 启动脚本。

**Q: 评价一直失败？**
A: 检查 `backend\.env` 中的 `LLM_API_KEY` 是否正确，模型名是否可用。

**Q: 收不到邮件通知？**
A: 确认 `NOTIFY_EMAIL_PASS` 是 SMTP 授权码而不是 QQ 密码。

**Q: 评分不够准确？**
A: 编辑 `backend\src\agent\prompt.ts` 调整评分标尺，或换更强的模型。
