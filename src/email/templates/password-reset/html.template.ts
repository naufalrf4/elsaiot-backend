export const passwordResetHtmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    /* Tailwind-compatible styles inlined here */
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f9fafb;
      color: #1f2937;
      line-height: 1.5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }
    .header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .logo {
      max-width: 150px;
      margin-bottom: 1rem;
    }
    .content {
      background-color: #ffffff;
      padding: 2rem;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
      margin-bottom: 1.5rem;
    }
    .button {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.375rem;
      font-weight: 600;
      margin: 1rem 0;
      text-align: center;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 0.875rem;
    }
    .text-small {
      font-size: 0.875rem;
    }
    .highlight {
      font-weight: bold;
      color: #1f2937;
    }
    .alert {
      background-color: #fee2e2;
      border-left: 4px solid #ef4444;
      padding: 1rem;
      margin: 1rem 0;
      color: #b91c1c;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="color: #2563eb; margin-bottom: 0;">ElsaIoT</h1>
      <p style="margin-top: 0.5rem;">Water Quality Monitoring System</p>
      <h2 style="margin-top: 1.5rem;">Reset Your Password</h2>
    </div>
    <div class="content">
      <p>Hello <span class="highlight">{{userName}}</span>,</p>
      <p>We received a request to reset your password for your ElsaIoT account. Please click the button below to reset your password:</p>
      
      <div style="text-align: center;">
        <a href="{{resetLink}}" class="button">Reset Password</a>
      </div>
      
      <p>This link will expire in <span class="highlight">{{expiresInHours}} hour(s)</span>.</p>
      
      <div class="alert">
        <p style="margin: 0;">If you did not request a password reset, please ignore this email or contact support if you have concerns about your account security.</p>
      </div>
      
      <p>For security reasons, this password reset link can only be used once.</p>
    </div>
    <div class="footer">
      <p>If the button above doesn't work, paste this link into your browser:</p>
      <p class="text-small">{{resetLink}}</p>
      <p>&copy; {{currentYear}} ElsaIoT. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
