import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(content, subject = "📩 每日AI建设者资讯简报") {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "AI资讯 <onboarding@resend.dev>",
      to: process.env.EMAIL_TO,
      subject: subject,
      html: content.replace(/\n/g, '<br>'),
      text: content
    });

    if (error) {
      console.error("❌ 发送失败：", error);
      throw error;
    }

    console.log("✅ 邮件发送成功！");
    return data;
  } catch (err) {
    console.error("❌ 异常：", err);
    throw err;
  }
}
