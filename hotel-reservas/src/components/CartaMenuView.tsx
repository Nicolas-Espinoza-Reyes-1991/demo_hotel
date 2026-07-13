"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiPath, publicAssetUrl } from "@/lib/api-path";
import { formatCurrency } from "@/lib/dates";
import type { PublicMenuCategory, PublicMenuItem } from "@/lib/menu";
import { buildMenuWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

function MenuItemRow({
  item,
  categoryName,
  index,
}: {
  item: PublicMenuItem;
  categoryName: string;
  index: number;
}) {
  const img = publicAssetUrl(item.imageUrl);
  const wa = buildWhatsAppUrl(
    buildMenuWhatsAppMessage({
      itemName: item.name,
      categoryName,
    })
  );

  return (
    <li
      className={cn("carta-item group", !item.available && "carta-item--soldout")}
      style={{ animationDelay: `${Math.min(index * 45, 300)}ms` }}
    >
      {img && (
        <div className="carta-item__media">
          <Image
            src={img}
            alt=""
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
            sizes="112px"
            unoptimized
          />
        </div>
      )}

      <div className="carta-item__body">
        <div className="carta-item__headline">
          <h3 className="carta-item__name">
            {item.name}
            {item.featured && (
              <span className="carta-item__star" aria-label="Destacado">
                ★
              </span>
            )}
          </h3>
          <span className="carta-item__dots" aria-hidden />
          <p className="carta-item__price">{formatCurrency(item.price)}</p>
        </div>

        {item.description && <p className="carta-item__desc">{item.description}</p>}

        <div className="carta-item__meta">
          {item.tags?.length > 0 && (
            <p className="carta-item__tags">
              {(Array.isArray(item.tags) ? item.tags : []).join(" · ")}
            </p>
          )}
          {!item.available ? (
            <span className="carta-item__sold">Agotado por hoy</span>
          ) : (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="carta-item__wa"
            >
              <WhatsAppIcon className="h-3.5 w-3.5" />
              Consultar
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.47 14.38c-.28-.14-1.64-.81-1.9-.9-.25-.1-.44-.14-.62.14-.18.27-.71.9-.87 1.08-.16.18-.32.2-.6.07-.28-.14-1.17-.43-2.23-1.37-.82-.73-1.38-1.64-1.54-1.92-.16-.27-.02-.42.12-.56.13-.12.28-.32.42-.48.14-.16.18-.27.28-.45.09-.18.05-.34-.02-.48-.07-.14-.62-1.5-.85-2.05-.22-.53-.45-.46-.62-.47h-.53c-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.3s.99 2.67 1.12 2.85c.14.18 1.95 2.98 4.72 4.18.66.28 1.18.45 1.58.58.66.21 1.27.18 1.75.11.53-.08 1.64-.67 1.87-1.32.23-.65.23-1.2.16-1.32-.07-.11-.25-.18-.53-.32Z" />
      <path d="M12.04 2C6.5 2 2 6.47 2 11.98c0 1.76.46 3.48 1.34 5L2 22l5.16-1.35a10 10 0 0 0 4.86 1.24h.01c5.54 0 10.04-4.47 10.04-9.98C22.06 6.47 17.57 2 12.04 2Zm0 18.2h-.01a8.3 8.3 0 0 1-4.22-1.16l-.3-.18-3.06.8.82-2.98-.2-.31a8.25 8.25 0 0 1-1.27-4.4c0-4.56 3.74-8.27 8.25-8.27 4.5 0 8.25 3.71 8.25 8.27 0 4.56-3.75 8.23-8.26 8.23Z" />
    </svg>
  );
}

export function CartaMenuView() {
  const [categories, setCategories] = useState<PublicMenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const scrollingToRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(apiPath("/api/public/menu"));
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "No se pudo cargar la carta.");
        if (cancelled) return;
        const next = (data.categories ?? []) as PublicMenuCategory[];
        setCategories(next);
        setActiveSlug(next[0]?.slug ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar la carta.");
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

  useEffect(() => {
    if (categories.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollingToRef.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target.getAttribute("data-slug");
        if (top) setActiveSlug(top);
      },
      { rootMargin: "-28% 0px -52% 0px", threshold: [0.2, 0.45, 0.7] }
    );

    categories.forEach((cat) => {
      const el = sectionRefs.current[cat.slug];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [categories]);

  const scrollToCategory = useCallback((slug: string) => {
    const el = sectionRefs.current[slug];
    if (!el) return;
    setActiveSlug(slug);
    scrollingToRef.current = slug;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      if (scrollingToRef.current === slug) scrollingToRef.current = null;
    }, 700);
  }, []);

  const generalWhatsApp = useMemo(
    () => buildWhatsAppUrl(buildMenuWhatsAppMessage()),
    []
  );

  if (loading) {
    return (
      <div className="carta-skeleton space-y-8 py-6" role="status" aria-label="Cargando carta">
        {[0, 1].map((block) => (
          <div key={block} className="space-y-4">
            <div className="mx-auto h-7 w-40 animate-pulse rounded bg-brand-700/25" />
            <div className="space-y-3">
              {[0, 1, 2].map((row) => (
                <div key={row} className="h-16 animate-pulse rounded-xl bg-brand-700/15" />
              ))}
            </div>
          </div>
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

  if (categories.length === 0) {
    return (
      <div className="carta-empty text-center">
        <p className="font-display text-3xl font-bold text-brand-100">Carta en preparación</p>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-brand-500">
          Pronto vas a poder ver aquí comida, bar y productos del hotel.
        </p>
        <a
          href={generalWhatsApp}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-whatsapp mt-6 inline-flex min-h-11 items-center gap-2 px-5"
        >
          <WhatsAppIcon className="h-4 w-4" />
          Consultar por WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div className="carta-menu">
      <nav className="carta-nav" aria-label="Categorías de la carta">
        <div className="carta-nav__track" role="tablist">
          {categories.map((category) => {
            const active = activeSlug === category.slug;
            return (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={cn("carta-nav__link", active && "carta-nav__link--active")}
                onClick={() => scrollToCategory(category.slug)}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="carta-sections">
        {categories.map((category) => (
          <section
            key={category.id}
            id={category.slug}
            data-slug={category.slug}
            ref={(el) => {
              sectionRefs.current[category.slug] = el;
            }}
            className="carta-section"
          >
            <header className="carta-section__head">
              <h2 className="carta-section__title">{category.name}</h2>
              <span className="carta-section__rule" aria-hidden />
            </header>

            <ul className="carta-section__list">
              {category.items.map((item, index) => (
                <MenuItemRow
                  key={item.id}
                  item={item}
                  categoryName={category.name}
                  index={index}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="carta-cta">
        <a
          href={generalWhatsApp}
          target="_blank"
          rel="noopener noreferrer"
          className="carta-cta__btn"
        >
          <WhatsAppIcon className="h-5 w-5" />
          Pedir o consultar por WhatsApp
        </a>
      </div>
    </div>
  );
}
