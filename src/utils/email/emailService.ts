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

  static async sendOTP(
    email: string,
    otp: string,
    firstName: string = 'there',
    expiryMinutes: number = 10,
  ): Promise<void> {
    const currentYear = new Date().getFullYear();

    const mailOptions = {
      from: `"The Bible Net" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Verification Code – The Bible Net',
      html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>The Bible Net - Email Verification</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#f4f8f8;
  font-family:Arial,Helvetica,sans-serif;
  color:#1f2937;
">

  <!-- Email preview text -->
  <div style="
    display:none;
    max-height:0;
    overflow:hidden;
    opacity:0;
    color:transparent;
  ">
    ${otp} is your The Bible Net verification code.
    It expires in ${expiryMinutes} minutes.
  </div>

  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"
    style="background:#f4f8f8;"
  >
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="
            max-width:620px;
            background:#ffffff;
            border-radius:20px;
            overflow:hidden;
            box-shadow:0 10px 30px rgba(15,118,110,.10);
          "
        >

          <!-- HEADER -->
          <tr>
            <td
              align="center"
              style="
                padding:34px 28px 30px;
                background:#0b7a81;
                background-image:
                  linear-gradient(
                    135deg,
                    #0b7a81 0%,
                    #0f9f97 55%,
                    #14b8a6 100%
                  );
              "
            >
              <div style="
                font-size:12px;
                letter-spacing:2.2px;
                text-transform:uppercase;
                color:#d7fffb;
                font-weight:700;
              ">
                The Bible Net
              </div>

              <div style="
                margin-top:10px;
                font-size:28px;
                line-height:1.2;
                color:#ffffff;
                font-weight:700;
              ">
                Verify your email
              </div>

              <div style="
                margin-top:10px;
                font-size:14px;
                line-height:1.6;
                color:#d9fffb;
              ">
                Read. Search. Share the Bible.
              </div>
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td style="padding:36px 36px 10px;">

              <div style="
                font-size:17px;
                line-height:1.7;
                color:#111827;
              ">
                Shalom <strong>${firstName}</strong>,
              </div>

              <div style="
                margin-top:18px;
                font-size:15px;
                line-height:1.75;
                color:#4b5563;
              ">
                Thank you for joining
                <strong style="color:#0b7a81;">
                  The Bible Net
                </strong>.
              </div>

              <div style="
                margin-top:8px;
                font-size:15px;
                line-height:1.75;
                color:#4b5563;
              ">
                Use the verification code below to verify your
                email address and continue.
              </div>

              <div style="
                margin-top:28px;
                font-size:13px;
                text-align:center;
                color:#64748b;
                font-weight:700;
                letter-spacing:.4px;
                text-transform:uppercase;
              ">
                Your verification code
              </div>

              <!-- OTP -->
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="margin-top:12px;"
              >
                <tr>
                  <td align="center">

                    <div style="
                      display:inline-block;
                      min-width:250px;
                      padding:20px 24px;
                      border:1px solid #bde9e4;
                      border-radius:16px;
                      background:#effcf9;
                      color:#075f63;
                      font-size:34px;
                      line-height:1;
                      font-weight:800;
                      letter-spacing:10px;
                      text-align:center;
                    ">
                      ${otp}
                    </div>

                  </td>
                </tr>
              </table>

              <div style="
                margin-top:18px;
                text-align:center;
                font-size:14px;
                line-height:1.6;
                color:#475569;
              ">
                This code will expire in
                <strong>
                  ${expiryMinutes} minutes
                </strong>.
              </div>

              <!-- SECURITY -->
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="margin-top:26px;"
              >
                <tr>
                  <td style="
                    padding:16px 18px;
                    background:#fff8e8;
                    border-left:4px solid #eab308;
                    border-radius:10px;
                    font-size:13px;
                    line-height:1.65;
                    color:#665314;
                  ">
                    <strong>Security reminder:</strong>
                    Please do not share this verification code
                    with anyone.
                  </td>
                </tr>
              </table>

              <div style="
                margin-top:24px;
                font-size:14px;
                line-height:1.75;
                color:#64748b;
              ">
                If you did not request this code, you can safely
                ignore this email.
              </div>

              <div style="
                margin-top:30px;
                font-size:15px;
                line-height:1.7;
                color:#334155;
              ">
                Blessings,<br>

                <strong style="color:#0b7a81;">
                  The Bible Net Team
                </strong>
              </div>

            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="padding:24px 36px 0;">
              <div style="
                height:1px;
                background:#e6efef;
              "></div>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td
              align="center"
              style="padding:24px 36px 30px;"
            >

              <div style="
                font-size:13px;
                line-height:1.6;
                color:#64748b;
              ">
                Read. Search. Share the Bible.
              </div>

              <div style="margin-top:10px;">
                <a
                  href="https://thebiblenet.com/"
                  style="
                    font-size:14px;
                    color:#0b7a81;
                    text-decoration:none;
                    font-weight:700;
                  "
                >
                  thebiblenet.com
                </a>
              </div>

              <div style="
                margin-top:16px;
                font-size:11px;
                line-height:1.6;
                color:#94a3b8;
              ">
                &copy; ${currentYear} The Bible Net.
                All rights reserved.
              </div>

            </td>
          </tr>

        </table>

        <div style="
          max-width:620px;
          margin-top:16px;
          font-size:11px;
          line-height:1.5;
          color:#94a3b8;
          text-align:center;
        ">
          This is an automated verification email.
          Please do not reply.
        </div>

      </td>
    </tr>
  </table>

</body>
</html>`,
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
