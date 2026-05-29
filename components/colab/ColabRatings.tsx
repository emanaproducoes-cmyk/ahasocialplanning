"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { ColabSession } from "@/lib/colab/types";

// ─── Coolicons SVG components ────────────────────────────────────────────────

const IconTarget = ({ size = 18, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const IconPencil = ({ size = 18, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

const IconImage = ({ size = 18, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const IconChat = ({ size = 18, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <circle cx="8" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="16" cy="10" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const IconHash = ({ size = 18, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);

const IconBarChart = ({ size = 18, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="18" y="3" width="4" height="18" rx="1" />
    <rect x="10" y="8" width="4" height="13" rx="1" />
    <rect x="2" y="13" width="4" height="8" rx="1" />
  </svg>
);

const IconStar = ({
  size = 18,
  filled = false,
  className = "",
}: {
  size?: number;
  filled?: boolean;
  className?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const IconHistory = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 .49-4.95" />
    <polyline points="12 7 12 12 15 15" />
  </svg>
);

const IconCheck = ({ size = 14, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconSend = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  adminUid: string;
  session?: ColabSession;
}

interface RatingCategory {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface RatingData {
  month: string; // "2026-05"
  ratings: Record<string, number>;
  comment: string;
  clientName: string;
  clientEmail: string;
  createdAt: Timestamp;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: RatingCategory[] = [
  {
    key: "temas",
    label: "Temas",
    description: "Relevância e criatividade dos temas",
    icon: <IconTarget size={18} />,
  },
  {
    key: "titulos",
    label: "Títulos",
    description: "Clareza e impacto dos títulos",
    icon: <IconPencil size={18} />,
  },
  {
    key: "artes",
    label: "Artes Digitais",
    description: "Qualidade visual das artes",
    icon: <IconImage size={18} />,
  },
  {
    key: "legendas",
    label: "Legendas",
    description: "Engajamento e qualidade das legendas",
    icon: <IconChat size={18} />,
  },
  {
    key: "hashtags",
    label: "Hashtags",
    description: "Relevância e alcance das hashtags",
    icon: <IconHash size={18} />,
  },
  {
    key: "estrategia",
    label: "Estratégia",
    description: "Coerência estratégica do planejamento",
    icon: <IconBarChart size={18} />,
  },
];

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function avg(vals: number[]): number {
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// ─── Star Rating Input ────────────────────────────────────────────────────────

function StarInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          onMouseEnter={() => !disabled && setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => !disabled && onChange(i)}
          className={`transition-colors ${
            disabled ? "cursor-default" : "cursor-pointer hover:scale-110"
          }`}
          style={{ color: i <= (hovered || value) ? "#f59e0b" : "#d1d5db" }}
        >
          <IconStar size={20} filled={i <= (hovered || value)} />
        </button>
      ))}
    </div>
  );
}

// ─── Star Display (read-only) ─────────────────────────────────────────────────

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{ color: i <= Math.round(value) ? "#f59e0b" : "#d1d5db" }}
        >
          <IconStar size={14} filled={i <= Math.round(value)} />
        </span>
      ))}
    </div>
  );
}

// ─── Circular Score ───────────────────────────────────────────────────────────

function CircularScore({
  score,
  size = 80,
}: {
  score: number;
  size?: number;
}) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 5) * circ;
  const color =
    score >= 4
      ? "#6366f1"
      : score >= 3
      ? "#f59e0b"
      : score >= 2
      ? "#f97316"
      : "#ef4444";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="4"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.22}
        fontWeight="700"
        fill={color}
      >
        {score > 0 ? score.toFixed(1) : "—"}
      </text>
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ColabRatings({ adminUid, session }: Props) {
  const [tab, setTab] = useState<"rate" | "history">("rate");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState<RatingData[]>([]);
  const [currentMonthRating, setCurrentMonthRating] =
    useState<RatingData | null>(null);

  const currentMonth = getCurrentMonth();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Load history from Firestore
  useEffect(() => {
    if (!adminUid || !session?.clientEmail) return;

    const q = query(
      collection(db, "colab_ratings"),
      where("adminUid", "==", adminUid),
      where("clientEmail", "==", session.clientEmail),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => d.data() as RatingData);
      setHistory(data);
      const thisMonth = data.find((d) => d.month === selectedMonth);
      setCurrentMonthRating(thisMonth ?? null);
      if (thisMonth) setSubmitted(true);
    });

    return unsub;
  }, [adminUid, session?.clientEmail, selectedMonth]);

  async function handleDelete(entryId: string) {
    const { deleteDoc, doc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'colab_ratings', entryId));
  }

  function handleEdit(entry: RatingData) {
    setRatings(entry.ratings);
    setComment(entry.comment ?? '');
    setSubmitted(false);
    setTab('rate');
    setSelectedMonth(entry.month);
  }

  function handleShare(method: 'link' | 'email') {
    const url = `${window.location.origin}/colab/invite?adminUid=${adminUid}&month=${selectedMonth}`;
    if (method === 'link') {
      navigator.clipboard.writeText(url);
      alert('Link copiado!');
    } else {
      window.location.href = `mailto:?subject=Avaliação ${formatMonthLabel(selectedMonth)}&body=Acesse para avaliar: ${url}`;
    }
  }

  const allFilled = CATEGORIES.every((c) => (ratings[c.key] ?? 0) > 0);

  async function handleSubmit() {
    if (!allFilled || submitting || submitted) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "colab_ratings"), {
        adminUid,
        clientName: session?.clientName ?? "",
        clientEmail: session?.clientEmail ?? "",
        month: selectedMonth,
        ratings,
        comment,
        createdAt: Timestamp.now(),
      });
      setSubmitted(true);
      setTab("history");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  // Overall average across all categories for current month
  const overallScore =
    currentMonthRating
      ? avg(Object.values(currentMonthRating.ratings))
      : submitted
      ? avg(Object.values(ratings))
      : 0;

  const overallLabel =
    overallScore >= 4.5
      ? "Excelente"
      : overallScore >= 3.5
      ? "Bom trabalho"
      : overallScore >= 2.5
      ? "Regular"
      : overallScore > 0
      ? "Precisa melhorar"
      : "";

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Avaliações &amp; Feedback
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Avalie a qualidade do trabalho — sua opinião melhora o nosso desempenho
        </p>
      </div>

      {/* Month selector + Share */}
      <div className="flex items-center gap-2 flex-wrap mt-2">
        <select
          value={selectedMonth}
          onChange={(e) => { setSelectedMonth(e.target.value); setSubmitted(false); setRatings({}); setComment(''); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          {Array.from({ length: 12 }, (_, i) => {
            const d = new Date(); d.setMonth(d.getMonth() - i);
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            return <option key={key} value={key}>{formatMonthLabel(key)}</option>;
          })}
        </select>
        <button onClick={() => handleShare('link')} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors">
          <img src="/icons/Link.svg" className="w-4 h-4 opacity-60" /> Copiar link
        </button>
        <button onClick={() => handleShare('email')} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors">
          <img src="/icons/Mail.svg" className="w-4 h-4 opacity-60" /> E-mail
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("rate")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "rate"
              ? "bg-indigo-600 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <IconStar size={15} filled={tab === "rate"} />
          Avaliar
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "history"
              ? "bg-indigo-600 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <IconHistory size={15} />
          Histórico ({history.length})
        </button>
      </div>

      {/* Rate tab */}
      {tab === "rate" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rating form */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Month header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                  Avaliação de
                </p>
                <p className="text-lg font-semibold text-gray-900 capitalize">
                  {formatMonthLabel(selectedMonth)}
                </p>
              </div>
              {submitted && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                  <IconCheck size={12} />
                  Avaliação enviada
                </span>
              )}
              {!submitted && (
                <CircularScore
                  score={avg(
                    CATEGORIES.map((c) => ratings[c.key] ?? 0).filter(
                      (v) => v > 0
                    )
                  )}
                  size={56}
                />
              )}
              {submitted && (
                <CircularScore
                  score={avg(Object.values(currentMonthRating?.ratings ?? ratings).filter(v => v > 0))}
                  size={56}
                />
              )}
            </div>

            {/* Categories */}
            <div className="divide-y divide-gray-50">
              {CATEGORIES.map((cat) => {
                const val = submitted
                  ? (currentMonthRating?.ratings[cat.key] ??
                    ratings[cat.key] ??
                    0)
                  : (ratings[cat.key] ?? 0);

                return (
                  <div
                    key={cat.key}
                    className="px-6 py-4 flex items-center gap-4"
                  >
                    {/* Progress bar background */}
                    <div className="absolute left-0 right-0 h-full pointer-events-none" />

                    {/* Icon */}
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                      {cat.icon}
                    </div>

                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">
                        {cat.label}
                      </p>
                      <p className="text-xs text-gray-400">{cat.description}</p>
                      {/* Progress bar */}
                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(val / 5) * 100}%`,
                            background:
                              val >= 4
                                ? "#6366f1"
                                : val >= 3
                                ? "#f59e0b"
                                : val >= 2
                                ? "#f97316"
                                : val > 0
                                ? "#ef4444"
                                : "#e5e7eb",
                          }}
                        />
                      </div>
                    </div>

                    {/* Stars */}
                    <StarInput
                      value={val}
                      onChange={(v) =>
                        setRatings((prev) => ({ ...prev, [cat.key]: v }))
                      }
                      disabled={submitted}
                    />
                  </div>
                );
              })}
            </div>

            {/* Comment */}
            <div className="px-6 py-4 border-t border-gray-100 space-y-3">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Comentário geral (opcional)
              </label>
              <textarea
                rows={3}
                disabled={submitted}
                value={
                  submitted
                    ? (currentMonthRating?.comment ?? comment)
                    : comment
                }
                onChange={(e) => setComment(e.target.value)}
                placeholder="Compartilhe sua opinião sobre o trabalho deste mês..."
                className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>

            {/* Submit */}
            {!submitted && (
              <div className="px-6 pb-5">
                <button
                  onClick={handleSubmit}
                  disabled={!allFilled || submitting}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold py-3 rounded-xl transition-colors"
                >
                  {submitting ? (
                    "Enviando..."
                  ) : (
                    <>
                      <IconSend size={15} />
                      Enviar avaliação
                    </>
                  )}
                </button>
                {!allFilled && (
                  <p className="text-center text-xs text-gray-400 mt-2">
                    Avalie todas as categorias para enviar
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Summary panel */}
          <div className="space-y-4">
            {/* Overall score */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center gap-3">
              <CircularScore score={overallScore} size={90} />
              <div className="text-center">
                <p className="font-semibold text-gray-800">Média Geral</p>
                {overallLabel && (
                  <p className="text-xs text-gray-400 mt-0.5">{overallLabel}</p>
                )}
              </div>
            </div>

            {/* Per-category summary */}
            {overallScore > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                {CATEGORIES.map((cat) => {
                  const val = currentMonthRating?.ratings[cat.key] ??
                    ratings[cat.key] ??
                    0;
                  return (
                    <div
                      key={cat.key}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="text-indigo-500">{cat.icon}</span>
                        <span className="text-sm">{cat.label}</span>
                      </div>
                      <StarDisplay value={val} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* History tab */}
      {tab === "history" && (
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400 text-sm">
              Nenhuma avaliação enviada ainda.
            </div>
          ) : (
            history.map((entry, idx) => {
              const entryAvg = avg(Object.values(entry.ratings));
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                    <p className="font-semibold text-gray-800 capitalize">
                      {formatMonthLabel(entry.month)}
                    </p>
                    <CircularScore score={entryAvg} size={52} />
                  </div>
                  <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {CATEGORIES.map((cat) => (
                      <div key={cat.key} className="flex items-center gap-2">
                        <span className="text-indigo-500 flex-shrink-0">
                          {cat.icon}
                        </span>
                        <div>
                          <p className="text-xs text-gray-500">{cat.label}</p>
                          <StarDisplay
                            value={entry.ratings[cat.key] ?? 0}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {entry.comment && (
                    <div className="px-6 pb-4">
                      <p className="text-xs text-gray-400 italic">
                        &ldquo;{entry.comment}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
