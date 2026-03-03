import nodemailer from 'nodemailer';

export class EmailService {
    private static transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

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
            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            console.error('Email sending failed:', error);
            throw new Error('Could not send verification email. Please try again.');
        }
    }
}
