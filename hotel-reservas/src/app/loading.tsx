import { CasonaPreloaderView } from "@/components/CasonaPreloader";
import { getHotelName } from "@/lib/brand";

export default function Loading() {
  return (
    <CasonaPreloaderView mode="route" hint="Cargando vista" hotelName={getHotelName()} />
  );
}
