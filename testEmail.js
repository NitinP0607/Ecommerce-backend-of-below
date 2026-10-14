
import "dotenv/config";
import { transporter } from "./configue/nodemailer.js";

try {
  await transporter.verify();
  console.log("✅ Brevo SMTP connected successfully!");

  const result = await transporter.sendMail({
    from: process.env.SENDER_EMAIL,
    to: process.env.TEST_EMAIL,
    subject: "NITRA Email Test",
    text: "Your NITRA email configuration is working!",
  });

  console.log("✅ Test email sent:", result.messageId);
} catch (error) {
  console.error("❌ Email error:", error.message);
}
