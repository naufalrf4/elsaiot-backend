export const passwordResetTextTemplate = `
Reset Your Password - ElsaIoT

Hello {{userName}},

We received a request to reset your password for your ElsaIoT account. 
Please follow the link below to reset your password:

{{resetLink}}

This link will expire in {{expiresInHours}} hour(s).

If you did not request a password reset, please ignore this email or contact support if you have concerns about your account security.

For security reasons, this password reset link can only be used once.

© {{currentYear}} ElsaIoT. All rights reserved.
`; 