import React, { useRef, useState } from 'react';
import mammoth from 'mammoth';
import type { ReflectionInput } from '../types/chat';

interface FileUploaderProps {
  onFilesLoaded: (reflections: ReflectionInput[]) => void;
  disabled?: boolean;
}

/**
 * 文件上传组件
 * 支持：纯文本(.txt/.md) / Word(.docx)
 */
export const FileUploader: React.FC<FileUploaderProps> = ({ onFilesLoaded, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const results: ReflectionInput[] = [];

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (ext === 'docx') {
        setParsing(true);
        try {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          if (result.value.trim()) {
            results.push({
              trainee: { name: '' },
              trainingTitle: file.name.replace(/\.docx$/i, ''),
              content: result.value.trim(),
            });
          }
        } catch (err) {
          console.error('DOCX 解析失败:', err);
        } finally {
          setParsing(false);
        }
      } else {
        const text = await file.text();
        if (text.trim()) {
          results.push({
            trainee: { name: '' },
            trainingTitle: file.name.replace(/\.[^.]+$/, ''),
            content: text.trim(),
          });
        }
      }
    }

    if (results.length > 0) {
      onFilesLoaded(results);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="file-uploader">
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.docx"
        multiple
        onChange={handleFileChange}
        disabled={disabled || parsing}
        className="file-input-hidden"
        id="file-upload"
      />
      <label
        htmlFor="file-upload"
        className={`file-upload-label ${disabled || parsing ? 'disabled' : ''}`}
        title={parsing ? '解析中...' : '上传培训心得文件（支持 .txt .md .docx）'}
      >
        {parsing ? '⏳' : '📎'}
      </label>
    </div>
  );
};
