import type { Metadata } from "next";
import { BookingHomePage } from "@/components/BookingHomePage";
import { hotelConfig } from "@/config/hotel";
import { buildPageMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Reservas online | Habitaciones en Futrono",
  description: hotelConfig.seo.description,
  path: "/",
  ogTitle: hotelConfig.seo.ogTitle,
  ogDescription: hotelConfig.seo.ogDescription,
});

export default function HomePage() {
  return <BookingHomePage />;
}
