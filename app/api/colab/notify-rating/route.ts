import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { to, name, agencyName, link } = await req.json();

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"${agencyName}" <${process.env.SMTP_USER}>`,
      to,
      subject: `Você foi convidado para o AHA Social Colab — ${agencyName}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem;">
          <h2 style="color:#7c6fff">AHA Social Colab</h2>
          <p>Olá${name ? `, ${name}` : ''}!</p>
          <p><strong>${agencyName}</strong> convidou você para acompanhar seu calendário de conteúdo.</p>
          <a href="${link}" style="display:inline-block;margin-top:1rem;padding:12px 24px;background:linear-gradient(135deg,#7c6fff,#4f8fff);color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
            Aceitar Convite
          </a>
          <p style="margin-top:1.5rem;color:#9b93c8;font-size:13px;">
            Este link expira em 7 dias.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Email error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
