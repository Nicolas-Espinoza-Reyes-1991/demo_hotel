"use client";

import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import { useEffect, useState } from "react";

type MercadoPagoCheckoutProps = {
  publicKey: string;
  checkoutToken: string;
  amount: number;
  email: string;
  onSuccess: (result: {
    transactionId?: string;
    paymentStatus: string;
    reservation: {
      confirmationCode: string;
      totalAmount: number;
      paymentStatus: string;
      nights: number;
      room: { name: string; code: string };
    };
  }) => void;
  onError: (message: string) => void;
};

export function MercadoPagoCheckout({
  publicKey,
  checkoutToken,
  amount,
  email,
  onSuccess,
  onError,
}: MercadoPagoCheckoutProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initMercadoPago(publicKey, { locale: "es-AR" });
    setReady(true);
  }, [publicKey]);

  if (!ready) {
    return <div className="glass-panel h-40 animate-pulse" />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-700 bg-brand-800 p-1">
      <CardPayment
        initialization={{
          amount,
          payer: { email },
        }}
        customization={{
          visual: {
            style: {
              theme: "default",
            },
          },
        }}
        onSubmit={async (formData) => {
          const response = await fetch("/api/checkout/pay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              checkoutToken,
              provider: "mercadopago",
              formData: {
                token: formData.token,
                payment_method_id: formData.payment_method_id,
                transaction_amount: formData.transaction_amount,
                installments: formData.installments,
                issuer_id: formData.issuer_id,
                payer: {
                  email: formData.payer.email ?? email,
                  identification: formData.payer.identification,
                },
              },
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            const message = data.error ?? "No se pudo procesar el pago.";
            onError(message);
            throw new Error(message);
          }

          onSuccess({
            transactionId: data.transactionId,
            paymentStatus: data.paymentStatus,
            reservation: {
              confirmationCode: data.reservation.confirmationCode,
              totalAmount: data.reservation.totalAmount,
              paymentStatus: data.reservation.paymentStatus,
              nights: data.reservation.nights,
              room: {
                name: data.reservation.room.name,
                code: data.reservation.room.code,
              },
            },
          });
        }}
        onError={(error) => {
          onError(typeof error === "object" && error && "message" in error ? String(error.message) : "Error en Mercado Pago.");
        }}
      />
    </div>
  );
}
