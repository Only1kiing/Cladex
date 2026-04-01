import { Resend } from "resend";
import { config } from "../config";

const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendVerificationEmail(email: string, code: string, name: string): Promise<boolean> {
  if (!resend) {
    console.log(`[DEV] Verification code for ${email}: ${code}`);
    return true;
  }

  try {
    await resend.emails.send({
      from: "Cladex <noreply@cladex.xyz>",
      to: email,
      subject: "Verify your Cladex account",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; background: #0a0a0f; color: #e5e7eb;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #B8FF3C; font-size: 28px; margin: 0;">CLADEX</h1>
          </div>
          <h2 style="color: #ffffff; font-size: 20px; text-align: center; margin-bottom: 8px;">Verify Your Email</h2>
          <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-bottom: 32px;">
            Hey ${name}, enter this code to verify your account:
          </p>
          <div style="background: #111118; border: 1px solid #1e1e2e; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #B8FF3C;">${code}</span>
          </div>
          <p style="color: #6b7280; font-size: 12px; text-align: center;">
            This code expires in 10 minutes. If you didn't sign up for Cladex, ignore this email.
          </p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("Failed to send verification email:", err);
    return false;
  }
}
