import { handleApiError, jsonOk } from "@/lib/api-response";
import { getBankTransferConfig } from "@/lib/bank-transfer";
import { isEmailNotificationsEnabled } from "@/lib/email";
import {
  getMercadoPagoCurrency,
  getMercadoPagoPublicKey,
  isMercadoPagoConfigured,
} from "@/lib/mercadopago";
import { isSimulatedPaymentAllowed } from "@/lib/reservation-holds";

export async function GET() {
  try {
    const mercadoPagoConfigured = isMercadoPagoConfigured();
    const simulatedAllowed = isSimulatedPaymentAllowed() && !mercadoPagoConfigured;
    const bankTransfer = getBankTransferConfig();

    return jsonOk({
      currency: getMercadoPagoCurrency(),
      online: {
        enabled: mercadoPagoConfigured || simulatedAllowed,
        provider: mercadoPagoConfigured ? "mercadopago" : simulatedAllowed ? "simulated" : "disabled",
        publicKey: mercadoPagoConfigured ? getMercadoPagoPublicKey() : null,
        label: mercadoPagoConfigured
          ? "Tarjeta / Mercado Pago"
          : simulatedAllowed
            ? "Tarjeta (demo)"
            : "Pago online no disponible",
      },
      bankTransfer,
      notifications: {
        emailEnabled: isEmailNotificationsEnabled(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
