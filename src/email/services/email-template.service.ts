import { Injectable } from '@nestjs/common';
import { passwordResetHtmlTemplate } from '../templates/password-reset/html.template';
import { passwordResetTextTemplate } from '../templates/password-reset/text.template';

@Injectable()
export class EmailTemplateService {
  /**
   * Renders the password reset email template
   * @param options Template variables
   * @returns Object containing HTML and plaintext versions of the email
   */
  renderPasswordResetEmail(options: {
    userName: string;
    resetLink: string;
    expiresInHours: number;
  }): { html: string; text: string } {
    const currentYear = new Date().getFullYear();
    
    // Replace placeholders in the HTML template
    let html = passwordResetHtmlTemplate;
    html = html.replace(/{{userName}}/g, options.userName);
    html = html.replace(/{{resetLink}}/g, options.resetLink);
    html = html.replace(/{{expiresInHours}}/g, options.expiresInHours.toString());
    html = html.replace(/{{currentYear}}/g, currentYear.toString());

    // Replace placeholders in the text template
    let text = passwordResetTextTemplate;
    text = text.replace(/{{userName}}/g, options.userName);
    text = text.replace(/{{resetLink}}/g, options.resetLink);
    text = text.replace(/{{expiresInHours}}/g, options.expiresInHours.toString());
    text = text.replace(/{{currentYear}}/g, currentYear.toString());

    return { html, text };
  }
} 