/**
 * HR 异常通知服务
 * 优先级：QQ邮箱 → PushPlus → Server酱 → 企微
 *
 * QQ邮箱（免费，推荐）:
 *   1. 登录 QQ邮箱 → 设置 → 账户 → 开启 SMTP 服务 → 拿到授权码
 *   2. .env 配置: NOTIFY_EMAIL / NOTIFY_EMAIL_PASS
 *
 * .env 配置:
 *   NOTIFY_EMAIL      — 接收通知的邮箱（也用作发送）
 *   NOTIFY_EMAIL_PASS  — QQ邮箱 SMTP 授权码（不是QQ密码）
 */

import nodemailer from 'nodemailer';
import type { EvaluationResult } from '../types';

/**
 * 发送异常通知给 HR
 */
export async function notifyHRException(result: EvaluationResult): Promise<boolean> {
  const content = buildContent(result);

  // 1. QQ邮箱（免费，首选）
  if (process.env.NOTIFY_EMAIL && process.env.NOTIFY_EMAIL_PASS) {
    return sendEmail(process.env.NOTIFY_EMAIL, process.env.NOTIFY_EMAIL_PASS, content);
  }

  // 2. PushPlus（备用）
  if (process.env.PUSHPLUS_TOKEN) {
    return sendPushPlus(process.env.PUSHPLUS_TOKEN, content);
  }

  // 3. Server酱（备用）
  if (process.env.SERVERCHAN_KEY) {
    return sendServerChan(process.env.SERVERCHAN_KEY, content);
  }

  // 4. 企微（备用）
  if (process.env.WECOM_WEBHOOK_URL) {
    return sendWeComMarkdown(process.env.WECOM_WEBHOOK_URL, content);
  }

  console.warn('[通知] 未配置推送渠道');
  console.warn('[通知] 推荐免费方案: QQ邮箱 → 设置 → 账户 → 开启SMTP → 拿授权码');
  console.warn('[通知] .env 配置: NOTIFY_EMAIL=你的QQ邮箱  NOTIFY_EMAIL_PASS=授权码');
  return false;
}

function buildContent(result: EvaluationResult) {
  const { trainee, trainingTitle, totalScore, exceptionReason, dimensions, feedbackSummary } = result;

  const subject = `⚠️ ${trainee.name}(${totalScore}分) — 培训心得需复核`;
  const body = [
    `员工：${trainee.name}${trainee.employeeId ? `（工号 ${trainee.employeeId}）` : ''}`,
    `培训：${trainingTitle}`,
    `得分：${totalScore}分`,
    `原因：${exceptionReason || '低分异常'}`,
    '',
    '【维度得分】',
    ...dimensions.map((d) => `  ${d.label}: ${d.score}/10`),
    '',
    '【系统建议反馈】',
    feedbackSummary,
    '',
    '---',
    '此邮件由培小评自动发送，请登录系统复核。',
  ].join('\n');

  return { subject, body };
}

/**
 * QQ邮箱 SMTP 发送（免费）
 */
async function sendEmail(
  toEmail: string,
  authCode: string,
  content: { subject: string; body: string }
): Promise<boolean> {
  try {
    // QQ邮箱 SMTP 配置
    const transporter = nodemailer.createTransport({
      host: 'smtp.qq.com',
      port: 465,
      secure: true,
      auth: {
        user: toEmail,
        pass: authCode,
      },
    });

    await transporter.sendMail({
      from: `培小评 <${toEmail}>`,
      to: toEmail,
      subject: content.subject,
      text: content.body,
    });

    console.log(`[邮件] ✅ 已发送到 ${toEmail}`);
    return true;
  } catch (err: any) {
    console.error(`[邮件] 发送失败: ${err.message}`);
    return false;
  }
}

/**
 * PushPlus（备用）
 */
async function sendPushPlus(
  token: string,
  content: { subject: string; body: string }
): Promise<boolean> {
  try {
    const res = await fetch('http://www.pushplus.plus/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, title: content.subject, content: content.body.replace(/\n/g, '<br>') }),
    });
    const data = await res.json() as any;
    if (data.code === 200) { console.log('[PushPlus] ✅'); return true; }
    console.error(`[PushPlus] ${data.msg}`);
    return false;
  } catch (err: any) {
    console.error(`[PushPlus] ${err.message}`);
    return false;
  }
}

/**
 * Server酱（备用）
 */
async function sendServerChan(
  sendKey: string,
  content: { subject: string; body: string }
): Promise<boolean> {
  try {
    const res = await fetch(`https://sctapi.ftqq.com/${sendKey}.send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: content.subject, desp: content.body }),
    });
    const data = await res.json() as any;
    return data.code === 0;
  } catch { return false; }
}

/**
 * 企业微信（备用）
 */
async function sendWeComMarkdown(
  webhookUrl: string,
  content: { subject: string; body: string }
): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msgtype: 'text', text: { content: content.body } }),
    });
    const data = await res.json() as any;
    return data.errcode === 0;
  } catch { return false; }
}
