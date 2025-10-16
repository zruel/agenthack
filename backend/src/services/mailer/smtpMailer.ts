import nodemailer from 'nodemailer';
import { cfg } from '../../config.js';
import { Mailer, Mail } from './mailer.js';

export class SmtpMailer implements Mailer {
  private transporter = nodemailer.createTransport({
    host: cfg.mail.host,
    port: cfg.mail.port,
    secure: cfg.mail.secure,
    auth: cfg.mail.user ? { user: cfg.mail.user, pass: cfg.mail.pass } : undefined,
  });
  async send(mail: Mail) {
    await this.transporter.sendMail({ from: cfg.mail.from, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text });
  }
}

export class ConsoleMailer implements Mailer {
  async send(mail: Mail) {
    console.log('[MAIL]', { from: cfg.mail.from, ...mail });
  }
}

export function getMailer(): Mailer {
  return cfg.mail.provider === 'smtp' ? new SmtpMailer() : new ConsoleMailer();
}