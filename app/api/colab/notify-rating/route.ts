import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { adminEmail, agencyName, month, average, comment } = await req.json();

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"AHA Social Colab" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `⭐ Nova avaliação recebida — ${month}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem;background:#0a0a1a;color:#f0eeff;border-radius:12px;">
          <h2 style="color:#b39dff;margin-bottom:0.5rem;">AHA Social Colab</h2>
          <p style="color:#9b93c8;margin-top:0;">Nova avaliação do cliente</p>
          <hr style="border-color:rgba(124,111,255,0.2);margin:1rem 0"/>
          <p><strong>Agência:</strong> ${agencyName}</p>
          <p><strong>Mês:</strong> ${month}</p>
          <p style="font-size:2rem;font-weight:700;color:#f5c842;">${average} ★</p>
          ${comment ? `<p><strong>Comentário:</strong> ${comment}</p>` : ''}
          <hr style="border-color:rgba(124,111,255,0.2);margin:1rem 0"/>
          <p style="font-size:11px;color:#9b93c8;">Acesse o painel para ver o detalhamento completo.</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('notify-rating error:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
