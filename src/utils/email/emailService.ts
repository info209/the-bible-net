import nodemailer from 'nodemailer';

export class EmailService {
  private static _transporter: nodemailer.Transporter | null = null;

  private static get transporter(): nodemailer.Transporter {
    const smtpHost = process.env.EMAIL_HOST;
    const smtpPort = parseInt(process.env.EMAIL_PORT || '587');
    const smtpSecure = process.env.EMAIL_SECURE === 'true';
    const smtpUser = process.env.EMAIL_USER;
    const smtpPass = process.env.EMAIL_PASS;

    console.log('[EmailService] SMTP config:', {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      user: smtpUser,
      passSet: !!smtpPass,
    });

    if (!this._transporter) {
      this._transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    }
    return this._transporter;
  }

  private static async executeWithRetry(mailOptions: any, retries = 3): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.transporter.sendMail(mailOptions);
        return;
      } catch (error: any) {
        console.error('[EmailService] sendMail failed:', {
          attempt,
          retries,
          code: error?.code,
          message: error?.message,
          responseCode: error?.responseCode,
          response: error?.response,
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT,
          user: process.env.EMAIL_USER,
          secure: process.env.EMAIL_SECURE,
          stack: error?.stack,
        });

        if (attempt < retries && ['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET'].includes(error.code)) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        if (process.env.NODE_ENV !== 'production' && error.code === 'ECONNREFUSED') {
          console.warn('Development mode: Email sending bypassed due to connection refusal.');
          return;
        }

        throw error;
      }
    }
  }

  static async sendOTP(email: string, otp: string): Promise<void> {
    const mailOptions = {
      from: `"The Bible Net" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #333; text-align: center;">Verify Your Account</h2>
          <p>Hello,</p>
          <p>Thank you for joining The Bible Net. Please use the following 6-digit verification code to complete your registration:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; text-align: center; margin: 30px 0; color: #4A90E2;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <hr />
          <p style="font-size: 12px; color: #777; text-align: center;">
            &copy; ${new Date().getFullYear()} The Bible Net. All rights reserved.
          </p>
        </div>
      `,
    };

    try {
      await this.executeWithRetry(mailOptions);
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error('Could not send verification email. Please try again.');
    }
  }

  static async sendPasswordReset(email: string, resetLink: string): Promise<void> {
    const mailOptions = {
      from: `"The Bible Net" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #333; text-align: center;">Reset Your Password</h2>
          <p>Hello,</p>
          <p>You requested to reset your password. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #41ADB0; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
          </div>
          <p>This link will expire in 15 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr />
          <p style="font-size: 12px; color: #777; text-align: center;">
            &copy; ${new Date().getFullYear()} The Bible Net. All rights reserved.
          </p>
        </div>
      `,
    };

    try {
      await this.executeWithRetry(mailOptions);
    } catch (error) {
      console.error('Password reset email failed:', error);
      throw new Error('Could not send password reset email.');
    }
  }
}
