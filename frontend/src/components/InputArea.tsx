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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    const looksLikeReflection =
      text.length > 20 &&
      (text.includes('培训') ||
        text.includes('心得') ||
        text.includes('收获') ||
        text.includes('学习') ||
        text.includes('老师') ||
        text.includes('课程') ||
        text.includes('知识') ||
        text.includes('计划') ||
        text.includes('工作'));
    const isLongText = text.length > 50;

    if (looksLikeReflection || isLongText) {
      const reflection: ReflectionInput = {
        trainee: { name: '' },
        trainingTitle: '培训心得',
        content: text,
      };
      onBatchEvaluate([reflection]);
    } else if (text.length <= 20 && text.length >= 2) {
      // 太短 → 提示多写点
      onSendMessage(`[SYSTEM_HINT:TOO_SHORT]${text}`);
    } else {
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

  return (
    <div className="input-area-container">
      <div className="input-row">
        <FileUploader onFilesLoaded={onBatchEvaluate} disabled={isLoading} />

        <textarea
          ref={textareaRef}
          className="chat-input"
          placeholder={isLoading ? '评价中...' : '直接粘贴心得，或点击 📎 上传文件（支持多选）...'}
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
