"use client";

import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { BookingModal } from "@/components/BookingModal";
import { RoomCard, type RoomCardData } from "@/components/RoomCard";
import {
  ReservationSuccessModal,
  type SuccessReservation,
} from "@/components/ReservationSuccessModal";
import { SearchForm, type SearchParams } from "@/components/SearchForm";
import { WhatsAppSupport } from "@/components/WhatsAppSupport";
import { showDemoUi } from "@/lib/app-ui";

export default function HomePage() {
  const [rooms, setRooms] = useState<RoomCardData[]>([]);
  const [search, setSearch] = useState<SearchParams | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomCardData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [successData, setSuccessData] = useState<SuccessReservation | null>(null);
  const demoUi = showDemoUi();

  async function handleSearch(params: SearchParams) {
    setLoading(true);
    setError(null);
    setEmptyMessage(null);
    setSearch(params);
    setSearched(true);

    try {
      const query = new URLSearchParams({
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        guests: String(params.guests),
      });

      const response = await fetch(`/api/availability?${query}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Error al buscar disponibilidad.");
      }

      setRooms(data.rooms);
      if (data.rooms.length === 0 && data.message) {
        setEmptyMessage(data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }

  function handleReserve(room: RoomCardData) {
    setSelectedRoom(room);
    setModalOpen(true);
  }

  return (
    <>
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 sm:py-10 sm:pb-32">
        <div className="rounded-3xl border border-white/55 bg-brand-900/58 p-4 shadow-[0_22px_58px_-22px_rgba(15,23,42,0.38)] backdrop-blur-[2px] sm:p-6 lg:p-8">
          {demoUi && (
            <section className="animate-fade-in-up mb-8 grid gap-4 sm:grid-cols-2">
              <a
                href="/"
                className="glass-panel-highlight group block p-5 transition hover:shadow-xl hover:shadow-emerald-500/15"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-accent">Módulo 1 · Activo</p>
                <h2 className="mt-2 text-lg font-bold text-brand-100 group-hover:text-accent">
                  Reservas Hotel Boye House
                </h2>
                <p className="mt-2 text-sm text-brand-500">
                  Disponibilidad en línea para tu estadía en Futrono.
                </p>
                <span className="mt-4 inline-block rounded-full bg-accent/15 px-3 py-1 text-sm font-bold text-accent">
                  Estás aquí →
                </span>
              </a>
              <a
                href="/admin"
                className="glass-panel animate-fade-in-up animate-delay-1 group block p-5 transition hover:border-amber-400/50 hover:shadow-lg hover:shadow-amber-500/15"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-gold">Módulo 2</p>
                <h2 className="mt-2 text-lg font-bold text-brand-100 group-hover:text-gold">
                  Panel administrativo
                </h2>
                <p className="mt-2 text-sm text-brand-500">
                  Calendario Gantt y gestión manual de estados.
                </p>
                <span className="mt-4 inline-block text-sm font-bold text-gold">Ir al admin →</span>
              </a>
            </section>
          )}

          <section className="animate-fade-in-up animate-delay-2 mb-8 space-y-3">
            {!demoUi && (
              <p className="inline-flex rounded-full bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-accent">
                Reserva directa
              </p>
            )}
            {demoUi && (
              <p className="inline-flex rounded-full bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-accent">
                Motor de reservas
              </p>
            )}
            <h1 className="max-w-2xl text-3xl font-extrabold tracking-tight text-brand-100 sm:text-4xl">
              Reserva tu{" "}
              <span className="bg-gradient-to-r from-accent to-accent-bright bg-clip-text text-transparent">
                refugio en Futrono
              </span>
            </h1>
            <p className="max-w-2xl text-sm text-brand-500 sm:text-base">
              Habitaciones cálidas, madera nativa y una experiencia boutique cerca del Lago Ranco, con
              soporte por WhatsApp.
            </p>
          </section>

          <div className="animate-fade-in-up animate-delay-3 mb-6">
            <SearchForm onSearch={handleSearch} loading={loading} />
          </div>

          <div className="animate-fade-in-up animate-delay-4 mb-8">
            <WhatsAppSupport variant="banner" />
          </div>

          {error && <div className="alert-error animate-fade-in mt-6">{error}</div>}

          <section className="mt-8">
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="glass-panel h-80 animate-pulse bg-brand-800" />
                ))}
              </div>
            ) : searched && rooms.length === 0 ? (
              <div className="glass-panel animate-fade-in p-8 text-center">
                <p className="text-lg font-bold text-brand-100">Sin disponibilidad</p>
                <p className="mt-2 text-sm text-brand-500">
                  {emptyMessage ??
                    "No hay habitaciones libres para esas fechas. Probá otro rango o contáctanos por WhatsApp."}
                </p>
                <div className="mt-5">
                  <WhatsAppSupport variant="compact" className="mx-auto max-w-sm" />
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {rooms.map((room, index) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    onReserve={handleReserve}
                    animationDelay={index}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <WhatsAppSupport variant="floating" />

      <BookingModal
        open={modalOpen}
        room={selectedRoom}
        search={search}
        onClose={() => setModalOpen(false)}
        onSuccess={(data) => {
          setSuccessData(data);
          if (search) handleSearch(search);
        }}
      />

      <ReservationSuccessModal
        open={!!successData}
        data={successData}
        onClose={() => setSuccessData(null)}
      />
    </>
  );
}
