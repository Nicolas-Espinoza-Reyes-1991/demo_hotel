"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { apiPath, publicAssetUrl } from "@/lib/api-path";
import { HOTEL_NAME } from "@/lib/brand";
import { formatCurrency } from "@/lib/dates";
import {
  EXPERIENCE_CATEGORIES,
  EXPERIENCE_CATEGORY_LABEL,
  type ExperienceCategory,
  type PublicExperience,
} from "@/lib/experiences";
import {
  buildExperienceWhatsAppMessage,
  buildWhatsAppUrlTo,
} from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.47 14.38c-.28-.14-1.64-.81-1.9-.9-.25-.1-.44-.14-.62.14-.18.27-.71.9-.87 1.08-.16.18-.32.2-.6.07-.28-.14-1.17-.43-2.23-1.37-.82-.73-1.38-1.64-1.54-1.92-.16-.27-.02-.42.12-.56.13-.12.28-.32.42-.48.14-.16.18-.27.28-.45.09-.18.05-.34-.02-.48-.07-.14-.62-1.5-.85-2.05-.22-.53-.45-.46-.62-.47h-.53c-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.3s.99 2.67 1.12 2.85c.14.18 1.95 2.98 4.72 4.18.66.28 1.18.45 1.58.58.66.21 1.27.18 1.75.11.53-.08 1.64-.67 1.87-1.32.23-.65.23-1.2.16-1.32-.07-.11-.25-.18-.53-.32Z" />
      <path d="M12.04 2C6.5 2 2 6.47 2 11.98c0 1.76.46 3.48 1.34 5L2 22l5.16-1.35a10 10 0 0 0 4.86 1.24h.01c5.54 0 10.04-4.47 10.04-9.98C22.06 6.47 17.57 2 12.04 2Zm0 18.2h-.01a8.3 8.3 0 0 1-4.22-1.16l-.3-.18-3.06.8.82-2.98-.2-.31a8.25 8.25 0 0 1-1.27-4.4c0-4.56 3.74-8.27 8.25-8.27 4.5 0 8.25 3.71 8.25 8.27 0 4.56-3.75 8.23-8.26 8.23Z" />
    </svg>
  );
}

export function ExperiencesGridView() {
  const [items, setItems] = useState<PublicExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ExperienceCategory | "ALL">("ALL");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(apiPath("/api/public/experiences"));
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar las experiencias.");
        if (!cancelled) setItems(data.experiences ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const availableCategories = useMemo(() => {
    const present = new Set(items.map((i) => i.category));
    return EXPERIENCE_CATEGORIES.filter((c) => present.has(c));
  }, [items]);

  const visible = useMemo(() => {
    if (filter === "ALL") return items;
    return items.filter((i) => i.category === filter);
  }, [items, filter]);

  if (loading) {
    return (
      <div className="exp-grid" role="status" aria-label="Cargando experiencias">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="exp-card exp-card--skeleton animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="carta-empty text-center">
        <p className="font-display text-2xl font-bold text-brand-100">{error}</p>
        <button
          type="button"
          className="btn-secondary mt-5 min-h-11 px-5"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="carta-empty text-center">
        <p className="font-display text-3xl font-bold text-brand-100">Pronto más aventuras</p>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-brand-500">
          Estamos conectando con operadores locales de turismo para armar la parrilla.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="exp-filters" aria-label="Filtrar por tipo de actividad">
        <button
          type="button"
          className={cn("exp-filter", filter === "ALL" && "exp-filter--active")}
          onClick={() => setFilter("ALL")}
        >
          Todas
        </button>
        {availableCategories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={cn("exp-filter", filter === cat && "exp-filter--active")}
            onClick={() => setFilter(cat)}
          >
            {EXPERIENCE_CATEGORY_LABEL[cat]}
          </button>
        ))}
      </nav>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-brand-500">
          No hay actividades en esta categoría.
        </p>
      ) : (
        <ul className="exp-grid">
          {visible.map((item, index) => {
            const img = publicAssetUrl(item.imageUrl);
            const wa = buildWhatsAppUrlTo(
              item.partner.whatsapp,
              buildExperienceWhatsAppMessage({
                experienceTitle: item.title,
                partnerName: item.partner.name,
                hotelName: HOTEL_NAME,
              })
            );
            return (
              <li
                key={item.id}
                className="exp-card"
                style={{ animationDelay: `${Math.min(index * 50, 350)}ms` }}
              >
                <div className="exp-card__media">
                  {img ? (
                    <Image
                      src={img}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="(max-width:640px) 100vw, 33vw"
                      unoptimized
                    />
                  ) : (
                    <div className="exp-card__placeholder" aria-hidden />
                  )}
                  {item.featured && <span className="exp-card__badge">Destacada</span>}
                  <span className="exp-card__cat">{item.categoryLabel}</span>
                </div>

                <div className="exp-card__body">
                  <h3 className="exp-card__title">{item.title}</h3>
                  {item.description && <p className="exp-card__desc">{item.description}</p>}
                  <div className="exp-card__meta">
                    <span>{item.partner.name}</span>
                    {item.duration && <span>· {item.duration}</span>}
                    {item.partner.area && <span>· {item.partner.area}</span>}
                  </div>
                  <div className="exp-card__footer">
                    <p className="exp-card__price">
                      {item.priceFrom == null
                        ? "Consultar valor"
                        : `Desde ${formatCurrency(item.priceFrom)}`}
                    </p>
                    <a href={wa} target="_blank" rel="noopener noreferrer" className="exp-card__wa">
                      <WhatsAppIcon className="h-4 w-4" />
                      Contactar
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
