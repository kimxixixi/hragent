import React, { useState, useRef, useCallback } from 'react';
import { FileUploader } from './FileUploader';
import type { ReflectionInput } from '../types/chat';

interface InputAreaProps {
  onSendMessage: (text: string) => void;
  onBatchEvaluate: (reflections: ReflectionInput[]) => void;
  isLoading: boolean;
}

export const InputArea: React.FC<InputAreaProps> = ({
  onSendMessage,
  onBatchEvaluate,
  isLoading,
}) => {
  const [input, setInput] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    // 检测是否为心得内容（超过20字 + 含培训相关关键词，或超过50字就可能是心得）
    const looksLikeReflection =
      text.length > 20 &&
      (text.includes('培训') ||
        text.includes('心得') ||
        text.includes('收获') ||
        text.includes('学习') ||
        text.includes('学员') ||
        text.includes('老师') ||
        text.includes('课程') ||
        text.includes('知识') ||
        text.includes('计划') ||
        text.includes('工作'));
    const isLongText = text.length > 50;

    if (looksLikeReflection || isLongText) {
      // 作为心得提交评价
      const reflection: ReflectionInput = {
        trainee: {
          name: '我',
          isManagement: false,
        },
        trainingTitle: '培训心得',
        content: text,
      };
      onBatchEvaluate([reflection]);
    } else {
      // 作为普通对话
      onSendMessage(text);
    }

    setInput('');
  }, [input, onSendMessage, onBatchEvaluate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFilesLoaded = useCallback(
    (reflections: ReflectionInput[]) => {
      onBatchEvaluate(reflections);
    },
    [onBatchEvaluate]
  );

  const handlePasteSubmit = useCallback(() => {
    if (!pasteText.trim()) return;

    // 解析粘贴的心得
    const parts = pasteText.split(/\n\s*[-=]{3,}\s*\n/);
    const reflections: ReflectionInput[] = parts
      .filter((p) => p.trim())
      .map((part, index) => {
        const nameMatch = part.match(/^[#*\s]*(?:学员|姓名)[：:]\s*(.+)$/m);
        const titleMatch = part.match(/^[#*\s]*(?:培训|主题|课程)[：:]\s*(.+)$/m);
        let content = part
          .replace(/^[#*\s]*(?:学员|姓名|培训|主题|课程|部门)[：:].*$/gm, '')
          .trim();

        return {
          trainee: { name: nameMatch?.[1]?.trim() || `学员${index + 1}`, isManagement: false },
          trainingTitle: titleMatch?.[1]?.trim() || '培训心得',
          content: content || part.trim(),
        };
      });

    onBatchEvaluate(reflections);
    setPasteText('');
    setShowPasteArea(false);
  }, [pasteText, onBatchEvaluate]);

  return (
    <div className="input-area-container">
      {/* 批量粘贴区域 */}
      {showPasteArea && (
        <div className="paste-area">
          <div className="paste-area-header">
            <span>📋 批量粘贴心得</span>
            <button
              className="btn-close"
              onClick={() => {
                setShowPasteArea(false);
                setPasteText('');
              }}
            >
              ✕
            </button>
          </div>
          <textarea
            className="paste-textarea"
            placeholder={`粘贴多篇培训心得，用 --- 分隔...

学员：张三
培训：高效沟通技巧
今天参加了高效沟通培训，收获很大...

---
学员：李四
培训：项目管理实战
通过本次项目管理培训，我学会了...`}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={8}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={handlePasteSubmit}
            disabled={!pasteText.trim()}
          >
            提交评价
          </button>
        </div>
      )}

      {/* 输入行 */}
      <div className="input-row">
        <FileUploader onFilesLoaded={handleFilesLoaded} disabled={isLoading} />

        <button
          className="btn-icon"
          onClick={() => setShowPasteArea(!showPasteArea)}
          title="批量粘贴心得"
          disabled={isLoading}
        >
          📋
        </button>

        <textarea
          ref={textareaRef}
          className="chat-input"
          placeholder={
            isLoading
              ? '评价中...'
              : '输入消息，或直接粘贴培训心得...'
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isLoading}
        />

        <button
          className="btn btn-send"
          onClick={handleSubmit}
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? '⏳' : '发送'}
        </button>
      </div>

      <div className="input-hints">
        <span>💡 直接粘贴你的培训心得，我会给你温暖的反馈～</span>
      </div>
    </div>
  );
};
