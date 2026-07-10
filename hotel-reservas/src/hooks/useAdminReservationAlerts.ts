"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiPath } from "@/lib/api-path";
import { isAlertSoundUnlocked, playReservationAlertBeep, unlockAlertSound } from "@/lib/alert-sound";

export type ReservationAlert = {
  id: string;
  confirmationCode: string;
  guestFullName: string;
  roomCode: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  paymentStatus: string;
  status: string;
  totalAmount: number;
  createdAt: string;
};

const CURSOR_KEY = "admin.alerts.cursor";
const SOUND_KEY = "admin.alerts.sound";
const POLL_MS = 12_000;

function readCursor(): string {
  if (typeof window === "undefined") return new Date().toISOString();
  const stored = localStorage.getItem(CURSOR_KEY);
  if (stored) return stored;
  const now = new Date().toISOString();
  localStorage.setItem(CURSOR_KEY, now);
  return now;
}

function readSoundPref(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SOUND_KEY) === "1";
}

export function useAdminReservationAlerts() {
  const [alerts, setAlerts] = useState<ReservationAlert[]>([]);
  const [unreadIds, setUnreadIds] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundReady, setSoundReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const cursorRef = useRef<string>(new Date().toISOString());
  const soundEnabledRef = useRef(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    cursorRef.current = readCursor();
    const pref = readSoundPref();
    setSoundEnabled(pref);
    soundEnabledRef.current = pref;
    setSoundReady(isAlertSoundUnlocked());
  }, []);

  const mergeAlerts = useCallback((incoming: ReservationAlert[]) => {
    if (incoming.length === 0) {
      hydratedRef.current = true;
      return;
    }

    const fresh = incoming.filter((a) => !knownIdsRef.current.has(a.id));
    for (const a of incoming) knownIdsRef.current.add(a.id);

    setAlerts((prev) => {
      const map = new Map(prev.map((a) => [a.id, a]));
      for (const a of incoming) map.set(a.id, a);
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    if (fresh.length > 0) {
      setUnreadIds((prev) => {
        const next = new Set(prev);
        for (const a of fresh) next.add(a.id);
        return Array.from(next);
      });
    }

    // No beep en la primera carga (hidratar pendientes sin asustar).
    if (hydratedRef.current && fresh.length > 0 && soundEnabledRef.current && isAlertSoundUnlocked()) {
      playReservationAlertBeep();
    }
    hydratedRef.current = true;
  }, []);

  const poll = useCallback(async () => {
    try {
      const since = encodeURIComponent(cursorRef.current);
      const res = await fetch(apiPath(`/api/admin/alerts?since=${since}&limit=15`), {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) setError("Sesión expirada.");
        return;
      }
      const data = (await res.json()) as { alerts?: ReservationAlert[] };
      setError(null);
      mergeAlerts(data.alerts ?? []);
    } catch {
      setError("No se pudo consultar alertas.");
    }
  }, [mergeAlerts]);

  useEffect(() => {
    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    function onVisibility() {
      if (document.visibilityState === "visible") void poll();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [poll]);

  const enableSound = useCallback(async () => {
    const ok = await unlockAlertSound();
    setSoundReady(ok);
    if (ok) {
      localStorage.setItem(SOUND_KEY, "1");
      setSoundEnabled(true);
      soundEnabledRef.current = true;
      playReservationAlertBeep();
    }
    return ok;
  }, []);

  const disableSound = useCallback(() => {
    localStorage.setItem(SOUND_KEY, "0");
    setSoundEnabled(false);
    soundEnabledRef.current = false;
  }, []);

  const markAllRead = useCallback(() => {
    const newest = alerts[0]?.createdAt ?? new Date().toISOString();
    const nextCursor =
      alerts.reduce((max, a) => (a.createdAt > max ? a.createdAt : max), newest) ||
      new Date().toISOString();
    cursorRef.current = nextCursor;
    localStorage.setItem(CURSOR_KEY, nextCursor);
    setUnreadIds([]);
  }, [alerts]);

  const markOneRead = useCallback((id: string) => {
    setUnreadIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const clearPanel = useCallback(() => {
    markAllRead();
    setAlerts([]);
    knownIdsRef.current = new Set();
  }, [markAllRead]);

  return {
    alerts,
    unreadCount: unreadIds.length,
    unreadIds,
    soundEnabled,
    soundReady,
    error,
    enableSound,
    disableSound,
    markAllRead,
    markOneRead,
    clearPanel,
    refresh: poll,
  };
}
