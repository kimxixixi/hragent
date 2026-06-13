import { Router, Request, Response } from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import path from 'path';
import fs from 'fs';

const router = Router();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.docx', '.txt', '.md', '.csv'];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件格式: ${ext}，仅支持 ${allowed.join(', ')}`));
    }
  },
});

/**
 * POST /api/upload/docx
 * 上传 Word 文档并提取文本
 */
router.post('/docx', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '请上传文件' });
      return;
    }

    const filePath = req.file.path;

    // 用 mammoth 提取文本
    const result = await mammoth.extractRawText({ path: filePath });

    // 清理临时文件
    fs.unlink(filePath, () => {});

    res.json({
      fileName: req.file.originalname,
      text: result.value,
      warnings: result.messages,
    });
  } catch (err: any) {
    console.error('DOCX 解析失败:', err);

    // 清理临时文件
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }

    res.status(500).json({ error: `文档解析失败: ${err.message}` });
  }
});

/**
 * POST /api/upload/text
 * 上传文本文件并读取内容
 */
router.post('/text', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '请上传文件' });
      return;
    }

    const content = fs.readFileSync(req.file.path, 'utf-8');

    // 清理临时文件
    fs.unlink(req.file.path, () => {});

    res.json({
      fileName: req.file.originalname,
      text: content,
    });
  } catch (err: any) {
    console.error('文件读取失败:', err);
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({ error: `文件读取失败: ${err.message}` });
  }
});

export default router;
