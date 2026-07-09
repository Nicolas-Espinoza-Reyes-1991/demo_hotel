export type BankTransferConfig = {
  enabled: boolean;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  accountType: string;
  cbu?: string;
  alias?: string;
  swift?: string;
  contactEmail?: string;
  deadlineHours: number;
  notes?: string;
};

export type PaymentConfigResponse = {
  currency: string;
  online: {
    enabled: boolean;
    comingSoon?: boolean;
    provider: "mercadopago" | "simulated" | "disabled";
    publicKey: string | null;
    label: string;
  };
  bankTransfer: BankTransferConfig | null;
  notifications: {
    emailEnabled: boolean;
  };
};
