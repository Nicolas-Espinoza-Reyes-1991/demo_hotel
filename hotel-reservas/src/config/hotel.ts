import hotelConfig from "@/config/hotel.generated.json";

/**
 * Configuración de marca del hotel (única fuente de verdad).
 *
 * Se genera desde `hotel.config.json` en la raíz del repo con
 * `node scripts/generate-landing.mjs`. No editar `hotel.generated.json` a mano.
 *
 * Las variables de entorno siguen teniendo prioridad donde aplica, para permitir
 * overrides por instancia sin regenerar (ver getters en brand.ts / whatsapp.ts / website.ts).
 */
export { hotelConfig };
export type HotelConfig = typeof hotelConfig;
