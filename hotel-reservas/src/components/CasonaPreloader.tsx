"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { LOGO_PATH } from "@/lib/brand";
import { publicAssetUrl } from "@/lib/api-path";

const MIN_MS = 850;
const MAX_MS = 9000;
const ROUTE_MIN_MS = 420;
const FADE_MS = 650;

type PreloaderMode = "initial" | "route";

function setLoadingClass(active: boolean) {
  document.documentElement.classList.toggle("casona-is-loading", active);
}

function readinessScore(logoLoaded: boolean) {
  let score = 0;
  if (document.readyState === "interactive" || document.readyState === "complete") score += 35;
  if (document.readyState === "complete") score += 25;
  if (logoLoaded) score += 40;
  return score;
}

export function CasonaPreloaderView({
  mode = "initial",
  hint = "Preparando tu experiencia",
  hotelName,
  onComplete,
}: {
  mode?: PreloaderMode;
  hint?: string;
  hotelName: string;
  onComplete?: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const logoSrc = publicAssetUrl(LOGO_PATH) ?? LOGO_PATH;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setLoadingClass(true);
    const start = Date.now();
    let dismissed = false;
    let progressTimer: ReturnType<typeof setInterval> | null = null;
    let fadeTimer: ReturnType<typeof setTimeout> | null = null;
    let maxTimer: ReturnType<typeof setTimeout> | null = null;

    const minMs = mode === "route" ? ROUTE_MIN_MS : MIN_MS;
    const maxMs = mode === "route" ? 4000 : MAX_MS;

    function updateProgress(value: number) {
      setProgress((current) => Math.min(100, Math.max(current, value)));
    }

    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      if (progressTimer) window.clearInterval(progressTimer);
      updateProgress(100);
      setHidden(true);
      fadeTimer = window.setTimeout(() => {
        setLoadingClass(false);
        if (mode === "initial") {
          window.dispatchEvent(new Event("casona:ready"));
        }
        onCompleteRef.current?.();
      }, FADE_MS);
    }

    function tick() {
      const elapsed = Date.now() - start;
      const target = Math.min(
        mode === "route" ? 88 : 92,
        readinessScore(logoLoaded) + Math.floor((elapsed / minMs) * (mode === "route" ? 24 : 18))
      );
      updateProgress(target);

      if (elapsed >= minMs && (mode === "route" || readinessScore(logoLoaded) >= 95)) {
        dismiss();
      }
    }

    function onReadyStateChange() {
      tick();
    }

    document.addEventListener("readystatechange", onReadyStateChange);
    window.addEventListener("load", tick);
    progressTimer = window.setInterval(tick, 120);
    maxTimer = window.setTimeout(dismiss, maxMs);
    tick();

    return () => {
      dismissed = true;
      if (progressTimer) window.clearInterval(progressTimer);
      if (fadeTimer) window.clearTimeout(fadeTimer);
      if (maxTimer) window.clearTimeout(maxTimer);
      document.removeEventListener("readystatechange", onReadyStateChange);
      window.removeEventListener("load", tick);
      setLoadingClass(false);
    };
  }, [logoLoaded, mode]);

  return (
    <div
      className={`casona-preloader${hidden ? " is-hidden" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Cargando"
    >
      <div className="casona-preloader__logo-wrap">
        <span className="casona-preloader__ring" aria-hidden="true" />
        <Image
          src={logoSrc}
          alt=""
          width={160}
          height={160}
          priority
          className="casona-preloader__logo"
          onLoad={() => setLogoLoaded(true)}
          onError={() => setLogoLoaded(true)}
        />
      </div>
      <p className="casona-preloader__brand">{hotelName}</p>
      <p className="casona-preloader__hint">{hint}</p>
      <div className="casona-preloader__track" aria-hidden="true">
        <span className="casona-preloader__bar" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

/** Preloader de arranque inicial — montado una vez en el layout raíz. */
export function CasonaInitialPreloader({ hotelName }: { hotelName: string }) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <CasonaPreloaderView
      mode="initial"
      hint="Preparando tu experiencia"
      hotelName={hotelName}
      onComplete={() => setVisible(false)}
    />
  );
}
