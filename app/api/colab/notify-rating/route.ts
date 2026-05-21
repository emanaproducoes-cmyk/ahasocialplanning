import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { to, agencyName, inviteUrl, type, rating, comment } = await req.json();

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    let subject = '';
    let html = '';

    if (type === 'invite') {
      subject = `Você foi convidado para o AHA Social Colab — ${agencyName}`;
      html = `
        <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; background: #0d1b4b; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #7c6fff, #4f8fff); padding: 2rem; text-align: center;">
            <h1 style="color: #fff; font-size: 24px; margin: 0; font-weight: 800;">AHA Social Colab ✦</h1>
            <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 8px 0 0;">Calendário colaborativo de conteúdo</p>
          </div>
          <div style="padding: 2rem; background: #12122a;">
            <h2 style="color: #f0eeff; font-size: 20px; margin: 0 0 1rem;">Você foi convidado! 🎉</h2>
            <p style="color: #9b93c8; font-size: 14px; line-height: 1.7; margin: 0 0 1.5rem;">
              A equipe <strong style="color: #b39dff;">${agencyName}</strong> convidou você para acompanhar o calendário de conteúdo no AHA Social Colab.
              Acesse o link abaixo para aceitar o convite e visualizar seu calendário.
            </p>
            <a href="${inviteUrl}" style="display: block; background: linear-gradient(135deg, #7c6fff, #4f8fff); color: #fff; text-decoration: none; text-align: center; padding: 14px; border-radius: 10px; font-weight: 700; font-size: 15px;">
              Aceitar Convite →
            </a>
            <p style="color: #9b93c8; font-size: 11px; text-align: center; margin-top: 1.5rem;">
              Este convite expira em 7 dias. Se não reconhece este convite, ignore este e-mail.
            </p>
          </div>
        </div>
      `;
    }

    if (type === 'rating') {
      subject = `Nova avaliação recebida — AHA Social Colab`;
      html = `
        <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; background: #12122a; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #7c6fff, #4f8fff); padding: 2rem; text-align: center;">
            <h1 style="color: #fff; font-size: 24px; margin: 0; font-weight: 800;">Nova Avaliação ⭐</h1>
          </div>
          <div style="padding: 2rem;">
            <p style="color: #9b93c8; font-size: 14px; line-height: 1.7; margin: 0 0 1rem;">
              Você recebeu uma nova avaliação no AHA Social Colab.
            </p>
            ${rating ? `<p style="color: #f5c842; font-size: 32px; font-weight: 800; text-align: center; margin: 1rem 0;">${rating} ★</p>` : ''}
            ${comment ? `<div style="background: rgba(124,111,255,0.1); border-radius: 10px; padding: 1rem; margin-top: 1rem;"><p style="color: #f0eeff; font-size: 14px; margin: 0;">"${comment}"</p></div>` : ''}
          </div>
        </div>
      `;
    }

    await transporter.sendMail({
      from: `"AHA Social Colab" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Email error:', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
