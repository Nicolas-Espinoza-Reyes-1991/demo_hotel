import { handleApiError, jsonOk } from "@/lib/api-response";
import { getBankTransferConfig } from "@/lib/bank-transfer";
import { isEmailNotificationsEnabled } from "@/lib/email";
import {
  getMercadoPagoCurrency,
  getMercadoPagoPublicKey,
  isMercadoPagoConfigured,
} from "@/lib/mercadopago";
import { isSimulatedPaymentAllowed, isOnlinePaymentEnabled } from "@/lib/reservation-holds";

export async function GET() {
  try {
    const mercadoPagoConfigured = isMercadoPagoConfigured();
    const simulatedAllowed = isSimulatedPaymentAllowed() && !mercadoPagoConfigured;
    const onlinePaymentEnabled = isOnlinePaymentEnabled();
    const onlineActive = onlinePaymentEnabled && (mercadoPagoConfigured || simulatedAllowed);
    const bankTransfer = getBankTransferConfig();

    return jsonOk({
      currency: getMercadoPagoCurrency(),
      online: {
        enabled: onlineActive,
        comingSoon: !onlineActive,
        provider: onlineActive
          ? mercadoPagoConfigured
            ? "mercadopago"
            : "simulated"
          : "disabled",
        publicKey: onlineActive && mercadoPagoConfigured ? getMercadoPagoPublicKey() : null,
        label: onlineActive
          ? mercadoPagoConfigured
            ? "Tarjeta / Mercado Pago"
            : "Tarjeta (demo)"
          : "Pago online · Pronto",
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
