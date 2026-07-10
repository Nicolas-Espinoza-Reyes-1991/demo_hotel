"use client";

import { ADKINIQ_NAME, ADKINIQ_URL } from "@/lib/adkiniq";

type AdminComingSoonPanelProps = {
  title: string;
  summary: string;
  highlights: string[];
};

export function AdminComingSoonPanel({ title, summary, highlights }: AdminComingSoonPanelProps) {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-start gap-5 px-1 py-4 sm:py-8">
      <span className="rounded-full border border-[#d4b896]/70 bg-[#faf6f0] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8b5a2b]">
        Pronto en desarrollo
      </span>

      <div className="space-y-2">
        <h2 className="font-display text-3xl font-bold leading-tight text-[#2c231c] sm:text-4xl">{title}</h2>
        <p className="max-w-xl text-sm leading-relaxed text-[#6d5e54] sm:text-base">{summary}</p>
      </div>

      <ul className="w-full space-y-2 rounded-2xl border border-[#d4b896]/45 bg-white/55 p-4 sm:p-5">
        {highlights.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm text-[#3d2b1f]">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8b5a2b]" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="rounded-2xl border border-[#3d2b1f]/12 bg-[#3d2b1f] px-4 py-4 text-[#faf6f0] sm:px-5">
        <p className="text-sm leading-relaxed">
          Este módulo está en desarrollo. Para solicitarlo e incorporarlo a tu hotel, contactá a tu proveedor{" "}
          <a
            href={ADKINIQ_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[#e8c99a] underline decoration-[#e8c99a]/50 underline-offset-2 hover:text-white"
          >
            {ADKINIQ_NAME}
          </a>
          .
        </p>
      </div>
    </section>
  );
}
