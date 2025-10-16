import nodemailer from 'nodemailer';
import { cfg } from '../../config.js';
export class SmtpMailer {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: cfg.mail.host,
            port: cfg.mail.port,
            secure: cfg.mail.secure,
            auth: cfg.mail.user ? { user: cfg.mail.user, pass: cfg.mail.pass } : undefined,
        });
    }
    async send(mail) {
        await this.transporter.sendMail({ from: cfg.mail.from, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text });
    }
}
export class ConsoleMailer {
    async send(mail) {
        console.log('[MAIL]', { from: cfg.mail.from, ...mail });
    }
}
export function getMailer() {
    return cfg.mail.provider === 'smtp' ? new SmtpMailer() : new ConsoleMailer();
}
