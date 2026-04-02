const { Resend } = require('resend');

// 初始化 Resend 客户端
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * 发送邮件（适配原项目的 deliver 接口）
 * @param {string} content - 生成好的摘要内容（HTML/纯文本）
 * @param {string} subject - 邮件标题
 */
async function sendEmail(content, subject = "📩 每日AI建设者资讯简报") {
  // 环境变量校验
  if (!process.env.RESEND_API_KEY) {
    throw new Error("❌ 缺少 RESEND_API_KEY 环境变量");
  }
  if (!process.env.EMAIL_TO) {
    throw new Error("❌ 缺少 EMAIL_TO 环境变量");
  }

  try {
    // 调用 Resend API 发送邮件
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "AI资讯 <onboarding@resend.dev>", // 免费发件箱
      to: process.env.EMAIL_TO,
      subject: subject,
      // 自动处理换行，兼容纯文本/HTML
      html: content.replace(/\n/g, '<br>'),
      text: content // 同时发送纯文本版本，提升送达率
    });

    if (error) {
      console.error("❌ 邮件发送失败：", error);
      throw error;
    }

    console.log("✅ 邮件发送成功！ID：", data.id);
    return data;
  } catch (err) {
    console.error("❌ 邮件发送异常：", err);
    throw err;
  }
}

// 导出接口，完全兼容原项目的调用方式
module.exports = {
  sendEmail
};
