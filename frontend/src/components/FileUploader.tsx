import React, { useRef, useState } from 'react';
import mammoth from 'mammoth';
import type { ReflectionInput } from '../types/chat';

interface FileUploaderProps {
  onFilesLoaded: (reflections: ReflectionInput[]) => void;
  disabled?: boolean;
}

/**
 * 文件上传组件
 * 支持：纯文本(.txt/.md) / Word(.docx) / Excel(.xlsx)
 */
export const FileUploader: React.FC<FileUploaderProps> = ({ onFilesLoaded, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 解析上传的文本文件为 ReflectionInput
   */
  const parseTextContent = (text: string, fileName: string): ReflectionInput[] => {
    const reflections: ReflectionInput[] = [];

    // 尝试按 "---" 或 "===" 分割多篇心得
    const parts = text.split(/\n\s*[-=]{3,}\s*\n/);

    // 如果只有一篇
    if (parts.length === 1) {
      reflections.push({
        trainee: {
          name: fileName.replace(/\.[^.]+$/, '') || '未命名学员',
          isManagement: false,
        },
        trainingTitle: '培训心得',
        content: text.trim(),
      });
      return reflections;
    }

    // 多篇心得
    parts.forEach((part, index) => {
      const trimmed = part.trim();
      if (!trimmed) return;

      // 尝试提取学员姓名和培训主题
      const nameMatch = trimmed.match(/^[#*\s]*(?:学员|姓名)[：:]\s*(.+)$/m);
      const titleMatch = trimmed.match(/^[#*\s]*(?:培训|主题|课程)[：:]\s*(.+)$/m);
      const deptMatch = trimmed.match(/^[#*\s]*(?:部门)[：:]\s*(.+)$/m);
      const positionMatch = trimmed.match(/^[#*\s]*(?:岗位|职位)[：:]\s*(.+)$/m);
      const mgmtMatch = trimmed.match(/^[#*\s]*(?:管理岗|管理层)[：:]\s*(是|否|true|false|yes|no)/m);

      // 移除元数据行，保留心得正文
      let content = trimmed
        .replace(/^[#*\s]*(?:学员|姓名|培训|主题|课程|部门|岗位|职位|管理岗|管理层)[：:].*$/gm, '')
        .trim();

      reflections.push({
        trainee: {
          name: nameMatch?.[1]?.trim() || `学员${index + 1}`,
          department: deptMatch?.[1]?.trim(),
          position: positionMatch?.[1]?.trim(),
          isManagement: mgmtMatch?.[1]?.trim() === '是' || mgmtMatch?.[1]?.trim() === 'yes' || false,
        },
        trainingTitle: titleMatch?.[1]?.trim() || '培训心得',
        content: content || trimmed,
      });
    });

    return reflections;
  };

  /**
   * 处理文件选择
   */
  const [parsingDocx, setParsingDocx] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allReflections: ReflectionInput[] = [];

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (ext === 'docx') {
        // Word 文档 — 用 mammoth 提取文本
        setParsingDocx(true);
        try {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          const text = result.value;
          if (text.trim()) {
            allReflections.push(...parseTextContent(text, file.name));
          }
          if (result.messages.length > 0) {
            console.warn('DOCX 解析警告:', result.messages);
          }
        } catch (err) {
          console.error('DOCX 解析失败:', err);
        } finally {
          setParsingDocx(false);
        }
      } else if (ext === 'xlsx' || ext === 'xls') {
        // Excel 文件 — 尝试读取为文本（或可对接后端解析）
        const text = await file.text();
        allReflections.push({
          trainee: {
            name: file.name.replace(/\.[^.]+$/, ''),
            isManagement: false,
          },
          trainingTitle: '培训心得 (Excel导入)',
          content: `[Excel文件内容] ${text.slice(0, 500)}`,
        });
      } else {
        // 纯文本文件 (.txt / .md / .csv)
        const text = await file.text();
        allReflections.push(...parseTextContent(text, file.name));
      }
    }

    if (allReflections.length > 0) {
      onFilesLoaded(allReflections);
    }

    // 重置 input，允许重复上传
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="file-uploader">
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.docx,.xlsx,.xls,.csv"
        multiple
        onChange={handleFileChange}
        disabled={disabled}
        className="file-input-hidden"
        id="file-upload"
      />
      <label
        htmlFor="file-upload"
        className={`file-upload-label ${disabled ? 'disabled' : ''}`}
        title="上传培训心得文件（支持 .txt / .md / .docx / .xlsx）"
      >
        📎
      </label>
    </div>
  );
};
