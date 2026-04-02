#!/usr/bin/env node

// ============================================================================
// Follow Builders — Delivery Script
// ============================================================================
// 从 stdin 读取 digest 内容，通过 Resend 发送邮件
//
// Usage:
//   node prepare-digest.js | node deliver.js
//   echo "content" | node deliver.js
//   node deliver.js --message "content"
//   node deliver.js --file /path/to/digest.txt
// ============================================================================

import { Resend } from 'resend';
import { readFile } from 'fs/promises';

// -- Read input ---------------------------------------------------------------

async function getDigestText() {
  const args = process.argv.slice(2);

  // Check --message flag
  const msgIdx = args.indexOf('--message');
  if (msgIdx !== -1 && args[msgIdx + 1]) {
    return args[msgIdx + 1];
  }

  // Check --file flag
  const fileIdx = args.indexOf('--file');
  if (fileIdx !== -1 && args[fileIdx + 1]) {
    return await readFile(args[fileIdx + 1], 'utf-8');
  }

  // Read from stdin
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

// -- Send Email ---------------------------------------------------------------

async function sendEmail(content, subject = "📩 每日AI建设者资讯简报") {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.EMAIL_TO;
  const fromEmail = process.env.EMAIL_FROM || "AI资讯 <onboarding@resend.dev>";

  if (!apiKey) {
    console.error("❌ RESEND_API_KEY 未设置");
    process.exit(1);
  }

  if (!toEmail) {
    console.error("❌ EMAIL_TO 未设置");
    process.exit(1);
  }

  const resend = new Resend(apiKey);

  try {
    console.error(`📧 正在发送邮件到: ${toEmail}`);

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: subject,
      html: content.replace(/\n/g, '<br>'),
      text: content
    });

    if (error) {
      console.error("❌ 发送失败：", error);
      throw error;
    }

    console.error("✅ 邮件发送成功！");
    console.log(JSON.stringify({
      status: 'ok',
      method: 'email',
      to: toEmail,
      messageId: data?.id
    }));
    return data;
  } catch (err) {
    console.error("❌ 异常：", err);
    console.log(JSON.stringify({
      status: 'error',
      method: 'email',
      message: err.message
    }));
    process.exit(1);
  }
}

// -- Main ---------------------------------------------------------------------

async function main() {
  const digestText = await getDigestText();

  if (!digestText || digestText.trim().length === 0) {
    console.error("⚠️ Digest 内容为空，跳过发送");
    console.log(JSON.stringify({ status: 'skipped', reason: 'Empty digest text' }));
    return;
  }

  // 如果输入是 JSON（来自 prepare-digest.js），提取实际内容
  let content = digestText;
  let subject = "📩 每日AI建设者资讯简报";

  try {
    const json = JSON.parse(digestText);
    // 如果是 prepare-digest.js 的输出格式，使用 stats 信息构建摘要
    if (json.status === 'ok') {
      const date = new Date().toLocaleDateString('zh-CN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      subject = `AI建设者资讯 — ${date}`;

      // 构建简单的文本摘要
      content = `# 每日AI建设者资讯简报\n\n`;
      content += `📅 ${date}\n\n`;

      if (json.x && json.x.length > 0) {
        content += `## 🐦 X/Twitter 动态\n\n`;
        for (const builder of json.x) {
          content += `### ${builder.name} (@${builder.handle})\n`;
          for (const tweet of builder.tweets) {
            content += `- ${tweet.text}\n  ${tweet.url}\n`;
          }
          content += `\n`;
        }
      }

      if (json.podcasts && json.podcasts.length > 0) {
        content += `## 🎙️ 播客更新\n\n`;
        for (const ep of json.podcasts) {
          content += `### ${ep.name}: ${ep.title}\n`;
          content += `${ep.url}\n\n`;
          if (ep.transcript) {
            // 截取前 500 字符作为预览
            content += `${ep.transcript.substring(0, 500)}...\n\n`;
          }
        }
      }

      if (json.blogs && json.blogs.length > 0) {
        content += `## 📝 博客文章\n\n`;
        for (const blog of json.blogs) {
          content += `### ${blog.title}\n`;
          content += `来源: ${blog.name}\n`;
          content += `${blog.url}\n\n`;
        }
      }

      content += `\n---\n由 Follow Builders 自动生成`;
    }
  } catch (e) {
    // 不是 JSON，直接使用原始内容
  }

  await sendEmail(content, subject);
}

main();
