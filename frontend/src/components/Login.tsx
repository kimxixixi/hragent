import React, { useState } from 'react';
import { login, setPassword, setAuth } from '../services/api';
import type { Identity } from '../types/chat';

interface LoginProps {
  onLogin: (identity: Identity) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'activate'>('login');
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'activate') {
        await setPassword(employeeId.trim(), name.trim(), password);
        // 激活成功后自动登录
        const res = await login(employeeId.trim(), password);
        setAuth(res);
        onLogin(res.identity);
      } else {
        const res = await login(employeeId.trim(), password);
        setAuth(res);
        onLogin(res.identity);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-view">
      <div className="login-card">
        <div className="login-header">
          <div className="chat-header-icon">🤖</div>
          <h1>培小评</h1>
          <p>员工培训心得评价 AI 助手</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="login-tabs">
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => { setMode('login'); setError(''); }}
            >
              登录
            </button>
            <button
              type="button"
              className={mode === 'activate' ? 'active' : ''}
              onClick={() => { setMode('activate'); setError(''); }}
            >
              首次使用 · 设置密码
            </button>
          </div>

          <label className="login-field">
            <span>工号</span>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="例如 S001"
              autoFocus
            />
          </label>

          {mode === 'activate' && (
            <label className="login-field">
              <span>姓名</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如 张三"
              />
            </label>
          )}

          <label className="login-field">
            <span>密码</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder={mode === 'activate' ? '至少 6 位' : '输入密码'}
            />
          </label>

          {error && <div className="login-error">❌ {error}</div>}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? '请稍候…' : mode === 'activate' ? '设置密码并登录' : '登录'}
          </button>
        </form>

        <p className="login-hint">
          {mode === 'activate'
            ? '首次使用先设置密码；已有账号请切到「登录」。'
            : '还没有密码？点「首次使用 · 设置密码」激活账号。'}
        </p>
      </div>
    </div>
  );
};
