#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""将初赛提交材料.md 转为格式化的 Word 文档"""

from docx import Document
from docx.shared import Pt, RGBColor, Inches, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import re

doc = Document()

# ---- 页面设置 ----
section = doc.sections[0]
section.page_width = Cm(21)
section.page_height = Cm(29.7)
section.top_margin = Cm(2.5)
section.bottom_margin = Cm(2.5)
section.left_margin = Cm(3)
section.right_margin = Cm(2.5)

# ---- 工具函数 ----
def set_font(run, name='微软雅黑', size=11, bold=False, color=None):
    run.font.name = name
    run.font.size = Pt(size)
    run.font.bold = bold
    if color:
        run.font.color.rgb = RGBColor(*color)
    # 确保中文字体正确设置
    r = run._r
    rPr = r.get_or_add_rPr()
    rFonts = OxmlElement('w:rFonts')
    rFonts.set(qn('w:eastAsia'), name)
    rPr.insert(0, rFonts)

def add_heading(text, level=1):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12 if level == 1 else 6)
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run(text)
    if level == 1:
        set_font(run, size=16, bold=True, color=(31, 73, 125))
    elif level == 2:
        set_font(run, size=13, bold=True, color=(0, 70, 127))
    elif level == 3:
        set_font(run, size=11, bold=True, color=(68, 114, 196))
    return p

def add_para(text, indent=0, bold=False, size=10.5):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(indent)
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    run = p.add_run(text)
    set_font(run, size=size, bold=bold)
    return p

def add_table(headers, rows):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = 'Table Grid'
    # 表头
    hdr_cells = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr_cells[i].text = h
        hdr_cells[i].paragraphs[0].paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = hdr_cells[i].paragraphs[0].runs[0] if hdr_cells[i].paragraphs[0].runs else hdr_cells[i].paragraphs[0].add_run(h)
        # 清除后重新设置
        hdr_cells[i].paragraphs[0].clear()
        run2 = hdr_cells[i].paragraphs[0].add_run(h)
        set_font(run2, size=10, bold=True, color=(255, 255, 255))
        # 设置表头背景
        tc = hdr_cells[i]._tc
        tcPr = tc.get_or_add_tcPr()
        shd = OxmlElement('w:shd')
        shd.set(qn('w:fill'), '1F497D')
        shd.set(qn('w:color'), 'auto')
        shd.set(qn('w:val'), 'clear')
        tcPr.append(shd)
    # 数据行
    for r_idx, row_data in enumerate(rows):
        row_cells = table.rows[r_idx + 1].cells
        for c_idx, cell_text in enumerate(row_data):
            row_cells[c_idx].text = ''
            run = row_cells[c_idx].paragraphs[0].add_run(str(cell_text))
            set_font(run, size=9.5)
            # 奇偶行背景
            if r_idx % 2 == 0:
                tc = row_cells[c_idx]._tc
                tcPr = tc.get_or_add_tcPr()
                shd = OxmlElement('w:shd')
                shd.set(qn('w:fill'), 'EEF3FA')
                shd.set(qn('w:color'), 'auto')
                shd.set(qn('w:val'), 'clear')
                tcPr.append(shd)
    doc.add_paragraph()
    return table

def add_code_block(text):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(0.5)
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run(text)
    run.font.name = 'Courier New'
    run.font.size = Pt(8.5)
    run.font.color.rgb = RGBColor(60, 60, 60)
    # 背景色
    pPr = p._p.get_or_add_pPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:fill'), 'F5F5F5')
    shd.set(qn('w:val'), 'clear')
    pPr.append(shd)
    return p

# ===================== 正文 =====================

# 封面
p_title = doc.add_paragraph()
p_title.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_title.paragraph_format.space_before = Pt(40)
p_title.paragraph_format.space_after = Pt(10)
run = p_title.add_run('首届全球HR精英AI黑客松大赛')
set_font(run, size=20, bold=True, color=(31, 73, 125))

p_title2 = doc.add_paragraph()
p_title2.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_title2.paragraph_format.space_after = Pt(4)
run2 = p_title2.add_run('初赛提交材料')
set_font(run2, size=16, bold=True, color=(31, 73, 125))

p_subtitle = doc.add_paragraph()
p_subtitle.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_subtitle.paragraph_format.space_after = Pt(40)
run3 = p_subtitle.add_run('培小评 — 员工培训心得评价 Agent')
set_font(run3, size=14, bold=False, color=(89, 89, 89))

doc.add_page_break()

# ================ 一、项目基本信息 ================
add_heading('一、项目基本信息', 1)
add_table(
    ['字段', '内容'],
    [
        ['项目名称', '培小评 — 员工培训心得评价 Agent'],
        ['对应赛道', '☑ 智能体（AI Agent）'],
        ['参赛类型', '☑ 个人组'],
        ['参赛个人 / 团队名称', '（请填写参赛者姓名）'],
        ['所属企业', '（请填写所属企业）'],
        ['项目负责人', '（请填写负责人姓名）'],
        ['联系方式', '（请填写联系方式）'],
        ['Demo 地址', 'http://localhost:5173（本地部署，见 README 快速启动）'],
        ['演示视频地址', '（另附录屏演示视频）'],
        ['提交日期', '2026年6月15日'],
    ]
)

# ================ 二、一句话介绍 ================
add_heading('二、项目一句话介绍', 1)
add_para(
    '本项目用于企业员工培训后心得评价场景，帮助 HR 培训专员及员工解决"人工逐条批阅费时费力、评价标准不一、低质量反馈流于形式"的问题，'
    '实现 AI 自动多维度评分 + 即时个性化反馈 + 低分智能预警 + HR 精准介入的价值。',
    size=11
)

# ================ 三、背景与痛点 ================
add_heading('三、项目背景与 HR 业务痛点', 1)
add_heading('1. 业务场景', 2)
add_para(
    '本项目应用于企业培训管理场景中的"培训后作业（心得）批阅"环节。员工参加内训、外训或线上学习后，须提交书面心得体会，'
    '由培训师或 HR 点评反馈，以确保培训知识落地转化。',
    size=10.5
)

add_heading('2. 当前痛点', 2)
add_table(
    ['痛点', '具体表现', '影响'],
    [
        ['人工点评效率低', '培训师需逐条微信/邮件回复，每季度处理约 50+ 份作业，平均每份耗时 10-15 分钟', '每季度至少浪费 8-12 小时在重复性点评上'],
        ['评价标准不统一', '不同培训师给同类心得的分数差异大，学员无法清楚了解差距', '考核数据失去可比性，无法准确评估培训ROI'],
        ['面子文化导致反馈失真', '对高管碍于职场关系不敢直指问题；对普通员工反馈又可能过于直白', '培训反馈形同虚设，无法帮助员工真正成长'],
        ['反馈时效性差', '人工批阅通常滞后 1-3 天，学员趁热打铁的学习窗口期已过', '培训转化率降低，知识遗忘曲线加速'],
    ]
)

add_heading('3. 目标用户', 2)
add_table(
    ['用户角色', '使用场景', '核心需求'],
    [
        ['员工（学员）', '参加完培训后，提交心得等待反馈', '获得即时、具体、有建设性的评价，知道哪里好、哪里可改进'],
        ['HR / 培训师', '管理培训质量，处理异常学员', '系统自动完成常规点评，仅在异常时介入，节省大量重复劳动'],
    ]
)

# ================ 四、项目目标 ================
add_heading('四、项目目标', 1)
add_heading('1. 业务目标', 2)
add_table(
    ['目标', '说明'],
    [
        ['提升效率', '常规心得批阅全自动化，HR 仅处理 <5 分低质量作业，人工介入率 < 20%'],
        ['提升准确性', '统一评价标准：5 维度加权评分模型，消除主观偏差，同类心得评分一致性 > 90%'],
        ['改善体验', '员工提交心得后秒级获得反馈，反馈内容具体可操作，告别"整体不错"等套话'],
        ['辅助决策', '异常数据（低分、管理岗偏低分）自动邮件通知 HR，支持快速复核与精准干预'],
    ]
)

add_heading('2. 可衡量指标', 2)
add_table(
    ['指标', '当前状态', '项目目标'],
    [
        ['单份心得处理时间', '人工 10-15 分钟', '< 30 秒（AI 自动处理）'],
        ['人工参与节点', '100% 需人工批阅', '仅 <20% 低分案例需人工复核'],
        ['输出准确率', '主观判断，难量化', '5 维度标准化打分，评分一致性 > 90%'],
        ['反馈时效', '1-3 天', '即时（< 30 秒）'],
    ]
)

# ================ 五、核心功能列表 ================
add_heading('五、核心功能列表', 1)
add_heading('1. 功能总览', 2)
add_table(
    ['功能模块', '功能说明', '用户价值', '优先级'],
    [
        ['多维度 AI 评价', '基于 5 维度（内容完整性/理解深度/实践结合/表达结构/反思深度）加权评分，自动生成个性化反馈', '员工获得具体公正评价；HR 省去人工打分', 'P0'],
        ['异常预警 + HR 通知', '评分 < 5 分或管理岗 < 7 分时，邮件通知 HR，HR 在面板"通过"或"编辑后发送"', 'HR 只关注需要关注的案例，工作量降低 80%+', 'P0'],
        ['对话式交互界面', '员工通过聊天界面提交心得（粘贴或上传文件），结果以评价卡片展示', '零学习成本，像发消息一样简单', 'P0'],
        ['语气调节引擎', '根据得分和学员岗位自动切换 celebratory/sandwich/gentle_redirect 三种语气', '告别"一刀切"反馈，兼顾专业性与组织和谐', 'P1'],
        ['红线安全过滤', '自动检测 20+ 禁用词 + 5 个敏感模式，自动替换温和表达', '规避 AI 不当表达引发员工情绪问题', 'P1'],
        ['HR 复核面板', '铃铛入口查看异常列表，一键"通过"或"编辑后发送"', '低分案例不遗漏，HR 操作极简', 'P1'],
        ['批量评价（SSE 流式）', '支持多篇心得一次提交，SSE 实时推送处理进度', '适合培训结束后批量处理班级作业', 'P2'],
    ]
)

add_heading('2. 详细功能说明', 2)

add_heading('功能1：多维度 AI 评价', 3)
add_table(
    ['字段', '内容'],
    [
        ['功能描述', '接收员工心得文本，调用大语言模型（默认 qwen-max，兼容 DeepSeek/OpenAI），按 5 维度评分并生成个性化反馈'],
        ['使用对象', '员工'],
        ['输入内容', '培训心得文本（字符串，支持 Markdown 格式）'],
        ['处理逻辑', '① 构建 System Prompt → ② 调用 LLM API → ③ 提取 JSON → ④ 语气引擎调节 → ⑤ 安全过滤 → ⑥ 异常检测'],
        ['输出结果', 'JSON：totalScore（加权总分）+ dimensions（5维分项）+ feedbackSummary + suggestions + toneLevel'],
        ['异常处理', 'JSON 解析失败自动重试；LLM 失败返回错误提示；安全过滤器检测敏感词自动替换'],
        ['成功标准', '评价结果引用心得原文具体内容，不同质量心得得分差异显著，建议可执行'],
    ]
)

add_heading('功能2：异常预警 + HR 通知', 3)
add_table(
    ['字段', '内容'],
    [
        ['功能描述', '评分触发异常规则时，自动发送 QQ 邮件通知 HR，包含学员信息、得分和 AI 反馈详情'],
        ['使用对象', 'HR / 培训专员'],
        ['输入内容', '评价结果（评分、维度详情、学员信息）'],
        ['处理逻辑', '总分 < 5 分 → 标记异常；管理岗且 < 7 分 → 标记异常 → nodemailer 发送邮件'],
        ['输出结果', 'HR 邮箱收到包含"学员姓名 + 工号 + 得分 + AI 建议反馈"的通知；异常记录存入 SQLite'],
        ['异常处理', '邮件发送失败时记录日志，不影响员工端正常流程（异步执行）'],
        ['成功标准', '异常案例 100% 通知到 HR，正常案例不发送通知，邮件信息完整清晰'],
    ]
)

# ================ 六、赛道专项说明 ================
add_heading('六、赛道专项说明（A. 智能体 AI Agent）', 1)
add_table(
    ['字段', '内容'],
    [
        ['智能体角色设定', '"培小评"——真诚、敏锐的培训反馈伙伴，扮演专业培训评价专家，直接与员工对话，用温暖但不敷衍的方式给出评价'],
        ['服务对象', '员工（直接交互）；HR/培训师（通过通知和复核面板间接使用）'],
        ['核心任务', '接收员工培训心得 → 多维度评分 → 生成个性化反馈 → 智能决策是否需要 HR 介入'],
        ['任务边界', '① 只评价心得内容，不评价人；② 禁用负面词汇；③ 低分/管理岗偏低分时转交人工，不独立发布敏感反馈'],
        ['知识库来源', '① 评分标尺（内置 Prompt，4 档分数段）；② 评价模板库（templates.ts）；③ 岗位能力模型（competency.ts）'],
        ['工具调用', 'LLM API（OpenAI 兼容格式）、nodemailer 邮件服务、SQLite 数据库读写、SSE 流式推送'],
        ['交互流程', '员工报到（姓名+工号）→ 提交心得 → 后端评价 → 前端展示评价卡片 / 显示"HR 复核中"'],
        ['输出格式', '结构化 JSON（totalScore + 5维度分项 + feedbackSummary + suggestions + toneLevel），前端渲染为评价卡片'],
    ]
)

# ================ 七、用户使用流程 ================
add_heading('七、用户使用流程', 1)
add_table(
    ['步骤', '用户动作', '系统 / AI 动作', '输出结果'],
    [
        ['1', '员工打开页面', '前端加载聊天界面，培小评发送欢迎语', '"你好！我是培小评，请告诉我你的姓名和工号"'],
        ['2', '员工输入"张三 S001"', '后端识别报到指令，存储学员信息', '"✅ 已记住！张三（工号 S001），请提交培训心得～"'],
        ['3', '员工粘贴心得（或上传 .docx/.txt）', '后端触发评价，调用 LLM API', '前端显示"正在评价中..."'],
        ['4', '等待约 10-30 秒', 'LLM 评价→语气引擎→安全过滤→异常检测→存入 SQLite', '—'],
        ['5a', '（≥5分）员工查看结果', '返回评价 JSON，前端渲染评价卡片', '总分 + 5维度进度条 + 个性化反馈 + 建议'],
        ['5b', '（<5分）员工看到状态', '标记异常，发邮件通知 HR', '员工看"HR 正在复核中"；HR 收到邮件'],
        ['6', 'HR 点击铃铛查看异常', '前端展示异常卡片（学员信息+AI评价详情）', 'HR 看到异常列表'],
        ['7a', 'HR 点击"直接通过"', '状态改为 approved，向员工推送 AI 评价', '员工看到完整评价卡片'],
        ['7b', 'HR 点击"驳回编辑"', '展开编辑框（预填评价模板），HR 撰写后发送', '员工看到 HR 定制的反馈'],
    ]
)

# ================ 八、核心 Prompt ================
add_heading('八、指令、代码或配置说明（核心 Prompt）', 1)
add_heading('角色设定', 2)
add_code_block(
    '你是"培小评"，一位真诚、敏锐的培训反馈伙伴。你直接与员工对话，\n'
    '任务是用温暖但不敷衍的方式，帮ta真正看到自己的成长和盲区。'
)

add_heading('核心原则', 2)
add_code_block(
    '1. 具体优先：每句评价都必须引用心得中的具体内容，禁止空泛的套话\n'
    '2. 严格但温暖：分数反映真实质量，语气保持鼓励\n'
    '3. 差异化的评分：不同质量的心得，得分必须有明显差距'
)

add_heading('评分标尺', 2)
add_table(
    ['分数段', '典型特征'],
    [
        ['8-10分', '复述了具体知识点 + 有自己的反思 + 写了可操作的行动计划 + 结构清晰'],
        ['5-7分', '提到了一些培训内容，有简单反思，但缺具体行动或深度不够'],
        ['2-4分', '只有笼统感受（"学到了很多"），无具体内容、无反思、无行动'],
        ['0-1分', '仅一句话表态，如"我会努力的""很重要"'],
    ]
)

add_heading('评价维度（满分10分，加权计算总分）', 2)
add_table(
    ['维度', '权重', '高分标准', '低分表现'],
    [
        ['内容完整性', '30%', '复述了2个以上培训中的具体知识点/模型', '未提及任何培训具体内容'],
        ['理解深度', '25%', '有自己的解读、质疑或延伸思考', '仅复述，无个人观点'],
        ['实践结合', '25%', '写了具体场景 + 可执行的行动步骤', '无行动，或只说"以后会注意"'],
        ['表达结构', '10%', '有分段、总分结构或清晰的逻辑线', '散乱无结构'],
        ['反思深度', '10%', '指出了自己过去的不足或思维转变', '无自我审视'],
    ]
)

add_heading('语气调节规则（自动决策）', 2)
add_table(
    ['条件', '语气级别', '反馈风格'],
    [
        ['总分 ≥ 8', 'celebratory', '热情具体地夸，再给一条"更高阶"的挑战建议'],
        ['总分 5-7', 'sandwich', '先肯定具体点 → 指出少了什么 → 鼓励'],
        ['总分 ≤ 4', 'gentle_redirect', '不批评，引导"下次可以加上这些内容..."，给具体模板'],
        ['管理岗升级一档', '—', 'gentle_redirect→sandwich，sandwich→celebratory'],
    ]
)

add_heading('红线安全过滤', 2)
add_para('禁用词（20+）：差、糟糕、不合格、敷衍、不用心、能力不足、不行、不够格、水平低…')
add_para('触发后自动替换：差→"有提升空间"，不合格→"暂未达到预期标准"，敷衍→"可以更深入"')

add_heading('输出格式（严格 JSON）', 2)
add_code_block(
    '{\n'
    '  "totalScore": 7.5,\n'
    '  "dimensions": [\n'
    '    {"name": "content_completeness", "label": "内容完整性", "score": 8, "weight": 0.30, "comment": "..."},\n'
    '    {"name": "understanding_depth",  "label": "理解深度",   "score": 7, "weight": 0.25, "comment": "..."},\n'
    '    {"name": "practice_integration", "label": "实践结合",   "score": 8, "weight": 0.25, "comment": "..."},\n'
    '    {"name": "expression_structure", "label": "表达结构",   "score": 7, "weight": 0.10, "comment": "..."},\n'
    '    {"name": "reflection_depth",     "label": "反思深度",   "score": 6, "weight": 0.10, "comment": "..."}\n'
    '  ],\n'
    '  "feedbackSummary": "必须包含心得中的具体内容",\n'
    '  "suggestions": ["具体可执行的建议1", "建议2"],\n'
    '  "toneLevel": "celebratory/sandwich/gentle_redirect"\n'
    '}'
)

add_heading('技术架构关键配置', 2)
add_code_block(
    '# .env 配置\n'
    'LLM_API_KEY=sk-xxxxxxxx\n'
    'LLM_MODEL=qwen-max\n'
    'LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1\n'
    'NOTIFY_EMAIL=hr@company.com\n'
    'NOTIFY_EMAIL_PASS=QQ邮箱SMTP授权码\n'
    'PORT=3001\n\n'
    '# 支持切换模型：\n'
    '# DeepSeek: LLM_MODEL=deepseek-chat, LLM_BASE_URL=https://api.deepseek.com/v1\n'
    '# OpenAI:   LLM_MODEL=gpt-4o,        LLM_BASE_URL=https://api.openai.com/v1'
)

# ================ 九、Demo ================
add_heading('九、Demo 说明', 1)
add_table(
    ['字段', '内容'],
    [
        ['Demo 地址', 'http://localhost:5173（本地运行，需按 README.md 配置 .env）'],
        ['演示视频地址', '（另附录屏演示视频）'],
        ['是否需要登录', '☑ 否（首次使用输入姓名+工号报到）'],
        ['测试账号', '无需注册，输入任意姓名+工号（如：张三 S001）'],
        ['测试密码', '无'],
        ['建议演示路径',
         '① 打开页面 → ② 输入"张三 S001"报到 → ③ 粘贴高质量心得（见高分.docx）→ ④ 查看评价卡片（预期8-9分）→\n'
         '⑤ 粘贴低质量心得（见低分.docx）→ ⑥ 看到"HR复核中" → ⑦ 点击铃铛切换HR视角 → ⑧ 演示"直接通过"和"编辑后发送"'],
        ['注意事项', '需先在 backend/.env 配置 LLM_API_KEY，再双击 start-backend.cmd 和 start-frontend.cmd 启动'],
        ['访问权限说明', '无需账号体系，任意员工输入姓名+工号即可使用'],
    ]
)

# ================ 十、创新点 ================
add_heading('十、项目创新点', 1)
add_table(
    ['创新点', '说明'],
    [
        ['业务创新', '将"培训师逐条微信点评"变为"AI 自动评价 + HR 仅处理异常"，HR 日常工作量归零，仅在真正需要判断的低分/敏感案例介入'],
        ['AI 应用创新', '语气调节引擎：非"一刀切"评价，根据评分和学员岗位自动切换三种反馈风格，解决"面子文化"导致的反馈失真问题'],
        ['体验创新', '纯对话式界面，员工体验与发微信一致，零学习成本；结果以结构化评价卡片呈现（总分+5维度进度条+具体建议）'],
        ['数据创新', '红线安全过滤器：内置 20+ 禁用词 + 5 个敏感正则模式，AI 生成内容经"自我审查"后输出，规避组织风险'],
        ['落地创新', '零门槛部署：Node.js + Express + SQLite，无需独立数据库，双击脚本即可启动；任意 OpenAI 兼容接口均可接入'],
    ]
)

# ================ 十一、业务价值 ================
add_heading('十一、业务价值与落地价值', 1)
add_table(
    ['价值类型', '具体说明'],
    [
        ['对 HR 的价值', '每季度 50+ 份心得批阅的 8-12 小时人工工时降低至仅处理 <10 份异常案例（约 0.5 小时），效率提升 90%+；邮件自动通知确保异常不遗漏'],
        ['对员工/学员的价值', '反馈时效从 1-3 天缩短至 <30 秒；反馈内容具体引用原文（不再是"整体不错"），员工清楚知道如何改进'],
        ['对管理者的价值', '自动存档所有评价结果（SQLite），可随时查阅班级表现和个人成长轨迹，支持培训 ROI 评估'],
        ['对组织的价值', '统一评价标准，消除主观偏差；语气调节引擎保护组织和谐；低分预警机制帮助管理者识别需额外辅导的员工'],
        ['可复制推广价值', '模块化设计，System Prompt 可按行业/企业文化定制；支持多种模型；轻量级部署，无需复杂 IT 基础设施'],
    ]
)

add_para('')
add_para(
    '价值总结：本项目预计能够帮助企业在员工培训后心得评价场景中，将逐条人工批阅工作转变为 AI 自动化处理，'
    '从而提升批阅效率（90%+ 时间节省），降低培训师重复劳动成本与反馈失真风险，改善员工培训转化率与反馈满意度。',
    bold=True, size=10.5
)

# ================ 十二、风险 ================
add_heading('十二、风险、限制与改进方向', 1)
add_table(
    ['类型', '当前限制', '后续优化方向'],
    [
        ['数据限制', '使用 SQLite 本地存储，无多用户权限隔离，不适合大规模多租户场景', '迁移至 PostgreSQL + 多租户架构，支持企业级权限管理'],
        ['模型准确性', 'LLM 评分存在随机性波动（temperature=0.8），同等质量心得评分可能略有差异', '引入评分一致性校验（多次采样取均值），或降低 temperature'],
        ['权限与安全', '无用户认证系统；HR 面板无单独权限保护', '接入企业微信/飞书 OAuth；HR 面板增加 Token 验证'],
        ['系统稳定性', '依赖外部 LLM API，网络异常时服务降级；高并发场景下响应时间受影响', '增加请求队列与超时重试；引入本地小模型作降级备选'],
        ['用户体验', '批量评价时 SSE 断线重连机制待完善；移动端适配有待优化', '增加 WebSocket 持久连接；优化移动端响应式布局'],
    ]
)

# ================ 十三、评审对应 ================
add_heading('十三、初赛评审对应说明', 1)
add_table(
    ['评审维度', '本项目对应说明'],
    [
        ['商业价值与实用性（40%）', '精准解决"培训心得批阅人工成本高、标准不一、反馈失真"三大真实 HR 痛点，项目逻辑清晰可落地，全量代码可运行，已具备企业部署条件'],
        ['创新性（30%）', '① 语气调节引擎（三档语气×岗位感知）解决 AI 评价"面子文化"盲区；② 红线安全过滤器保障 AI 内容安全，是 HR 场景中少见的"组织风险防控"设计'],
        ['技术实现度（20%）', '完整全栈实现（React + Express + TypeScript + SQLite + SSE）；核心评价链路端到端可运行；支持 3 种以上 LLM 接入；代码结构清晰，单一职责模块化设计'],
        ['用户体验', '纯对话式界面，零学习成本；评价结果结构化卡片展示，信息层级清晰；HR 操作路径最短（1 次点击完成复核）'],
        ['材料完整性（10%）', '✅ 功能说明  ✅ 核心 Prompt（第八章）  ✅ 完整代码（backend + frontend）  ✅ Demo 可启动  ✅ 演示视频（另附）'],
    ]
)

# ================ 十四、团队分工 ================
add_heading('十四、团队分工说明', 1)
add_para('个人组，不适用。', size=10.5)

doc.add_paragraph()
add_para('提交邮箱：hackathon@hrflag.com', size=10)
add_para('提交截止：2026年6月15日 23:59', size=10)

# 保存
out_path = r'D:\hr\agent\初赛提交材料.docx'
doc.save(out_path)
print(f'已生成: {out_path}')
