// app/api/colab/notify-rating/route.ts
// Envia e-mail ao social media quando o cliente submete uma avaliação.
// Usa Nodemailer (SMTP) — configure as variáveis de ambiente.

import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { RATING_CATEGORIES } from '@/lib/colab/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminEmail, clientName, agencyName, month, average, ratings, comment } = body;

    if (!adminEmail || !clientName || !average) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Build ratings table rows
    const ratingRows = RATING_CATEGORIES.map((cat) => {
      const val   = ratings?.[cat.id] ?? 0;
      const stars = '⭐'.repeat(val) + '☆'.repeat(5 - val);
      return `
        <tr>
          <td style="padding:8px 12px; border-bottom:1px solid #1e1b4b; color:#c4b5fd;">${cat.icon} ${cat.label}</td>
          <td style="padding:8px 12px; border-bottom:1px solid #1e1b4b; text-align:center; font-size:18px;">${stars}</td>
          <td style="padding:8px 12px; border-bottom:1px solid #1e1b4b; text-align:center; color:#a78bfa; font-weight:700;">${val}/5</td>
        </tr>`;
    }).join('');

    const avgNum = parseFloat(average);
    const avgColor = avgNum >= 4.5 ? '#34d399' : avgNum >= 3.5 ? '#60a5fa' : avgNum >= 2.5 ? '#fbd44b' : '#f87171';

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#06061a;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:40px 20px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed,#9333ea);border-radius:18px;padding:32px;text-align:center;margin-bottom:24px;">
      <div style="font-size:36px;margin-bottom:8px;">⭐</div>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.02em;">Nova Avaliação Recebida</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:14px;">AHA Social Colab</p>
    </div>

    <!-- Info card -->
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(124,58,237,0.25);border-radius:14px;padding:20px;margin-bottom:20px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div>
          <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px;">Cliente</div>
          <div style="font-size:15px;font-weight:700;color:#fff;">${clientName}</div>
        </div>
        <div>
          <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px;">Mês</div>
          <div style="font-size:15px;font-weight:700;color:#fff;text-transform:capitalize;">${month}</div>
        </div>
      </div>
    </div>

    <!-- Average -->
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:24px;text-align:center;margin-bottom:20px;">
      <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Média Geral</div>
      <div style="font-size:52px;font-weight:900;color:${avgColor};line-height:1;">${average}</div>
      <div style="font-size:14px;color:#6b7280;margin-top:4px;">de 5.0 pontos</div>
    </div>

    <!-- Ratings table -->
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;overflow:hidden;margin-bottom:20px;">
      <div style="padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <h3 style="margin:0;font-size:13px;font-weight:700;color:#a78bfa;text-transform:uppercase;letter-spacing:0.08em;">Avaliações por categoria</h3>
      </div>
      <table style="width:100%;border-collapse:collapse;color:#e2e8f0;font-size:13px;">
        <tbody>${ratingRows}</tbody>
      </table>
    </div>

    ${comment ? `
    <!-- Comment -->
    <div style="background:rgba(124,58,237,0.10);border:1px solid rgba(124,58,237,0.20);border-radius:14px;padding:18px;margin-bottom:20px;">
      <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">💬 Comentário do cliente</div>
      <p style="margin:0;color:#c4b5fd;font-size:14px;line-height:1.6;font-style:italic;">"${comment}"</p>
    </div>` : ''}

    <!-- Footer -->
    <div style="text-align:center;padding-top:16px;">
      <p style="font-size:11px;color:#4b5563;margin:0;">AHA Social Colab · ${agencyName}</p>
      <p style="font-size:10px;color:#374151;margin:4px 0 0;">Este e-mail foi enviado automaticamente. Por favor, não responda.</p>
    </div>
  </div>
</body>
</html>`;

    // Nodemailer transport
    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST    ?? 'smtp.gmail.com',
      port:   parseInt(process.env.SMTP_PORT ?? '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from:    `"AHA Social Colab" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
      to:      adminEmail,
      subject: `⭐ Nova avaliação de ${clientName} — Média ${average}/5 · ${month}`,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[notify-rating]', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
