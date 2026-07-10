"use client";

import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { BookingModal } from "@/components/BookingModal";
import { RoomCard, type RoomCardData } from "@/components/RoomCard";
import {
  ReservationSuccessModal,
  type SuccessReservation,
} from "@/components/ReservationSuccessModal";
import { BookingResultsSummary } from "@/components/BookingResultsSummary";
import { RoomCardSkeleton } from "@/components/RoomCardSkeleton";
import { SearchForm, type SearchParams } from "@/components/SearchForm";
import { WhatsAppSupport } from "@/components/WhatsAppSupport";
import { apiPath } from "@/lib/api-path";
import { calculateNights } from "@/lib/dates";

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
  const [resultNights, setResultNights] = useState<number | undefined>(undefined);

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

      const response = await fetch(`${apiPath("/api/availability")}?${query}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Error al buscar disponibilidad.");
      }

      setRooms(data.rooms);
      setResultNights(typeof data.nights === "number" ? data.nights : calculateNights(params.checkIn, params.checkOut));
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

      <main className="mx-auto max-w-7xl px-4 py-4 pb-24 sm:px-6 sm:py-6 sm:pb-28">
        <div className="booking-shell space-y-4 sm:space-y-5">
          <div className="booking-hero-panel animate-fade-in-up space-y-4 sm:space-y-5">
            <section className="space-y-2">
              <p className="inline-flex rounded-full border border-accent/20 bg-white/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-accent sm:text-xs">
                Reserva directa
              </p>
              <h1 className="max-w-2xl text-2xl font-extrabold tracking-tight text-brand-100 sm:text-3xl lg:text-[2rem]">
                Reserva tu <span className="text-accent">refugio en Futrono</span>
              </h1>
            </section>

            <div className="animate-fade-in-up animate-delay-2">
              <SearchForm onSearch={handleSearch} loading={loading} />
            </div>
          </div>

          {error && <div className="alert-error animate-fade-in">{error}</div>}

          <section>
            {searched && !loading && search && rooms.length > 0 ? (
              <BookingResultsSummary search={search} count={rooms.length} nights={resultNights} />
            ) : null}

            {loading ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <RoomCardSkeleton key={i} />
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
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
