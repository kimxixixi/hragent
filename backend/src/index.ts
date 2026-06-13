import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

import chatRouter from './routes/chat';
import evaluateRouter from './routes/evaluate';
import exceptionsRouter from './routes/exceptions';
import uploadRouter from './routes/upload';

const app = express();
const PORT = process.env.PORT || 3001;

// ── 中间件 ──
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 确保 data 目录存在
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// ── API 路由 ──
app.use('/api/chat', chatRouter);
app.use('/api/evaluate', evaluateRouter);
app.use('/api/exceptions', exceptionsRouter);
app.use('/api/upload', uploadRouter);

// ── 健康检查 ──
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── 错误处理 ──
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 HR 培训心得评价 Agent 后端服务已启动`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api/health`);
  console.log('');
  console.log('可用端点:');
  console.log(`  POST /api/chat       — 对话交互`);
  console.log(`  POST /api/evaluate    — 批量评价 (SSE)`);
  console.log(`  POST /api/evaluate/single — 单篇评价`);
  console.log(`  GET  /api/exceptions  — 异常列表`);
  console.log(`  PUT  /api/exceptions/:id — 处理异常`);
  console.log(`  POST /api/upload/docx  — 上传Word文档解析`);
});

export default app;
