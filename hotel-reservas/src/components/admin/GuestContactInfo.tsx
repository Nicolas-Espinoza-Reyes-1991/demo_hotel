import { formatBirthDateForDisplay } from "@/lib/guest-identity";
import type { GuestDocumentType } from "@/lib/guest-identity";

type GuestContactInfoProps = {
  email?: string | null;
  phone?: string | null;
  documentType?: GuestDocumentType | string | null;
  rut?: string | null;
  passport?: string | null;
  birthDate?: string | null;
  compact?: boolean;
};

function ContactLine({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <p className="text-xs text-brand-500">
      <span className="font-medium text-brand-100/80">{label}: </span>
      {href ? (
        <a href={href} className="text-accent hover:underline">
          {value}
        </a>
      ) : (
        <span>{value}</span>
      )}
    </p>
  );
}

function EmptyLine({ label }: { label: string }) {
  return (
    <p className="text-xs text-brand-500">
      <span className="font-medium text-brand-100/80">{label}: </span>
      <span className="italic">No informado</span>
    </p>
  );
}

export function GuestContactInfo({
  email,
  phone,
  documentType,
  rut,
  passport,
  birthDate,
  compact,
}: GuestContactInfoProps) {
  const docType = documentType === "PASSPORT" ? "PASSPORT" : "RUT";
  const documentValue = docType === "PASSPORT" ? passport : rut;
  const documentLabel = docType === "PASSPORT" ? "Pasaporte" : "RUT";

  return (
    <div className={compact ? "space-y-0.5" : "space-y-1"}>
      {email ? (
        <ContactLine label="Email" value={email} href={`mailto:${email}`} />
      ) : (
        <EmptyLine label="Email" />
      )}
      {phone ? (
        <ContactLine label="Tel." value={phone} href={`tel:${phone.replace(/\s/g, "")}`} />
      ) : (
        <EmptyLine label="Tel." />
      )}
      {documentValue ? (
        <ContactLine label={documentLabel} value={documentValue} />
      ) : (
        <EmptyLine label={documentLabel} />
      )}
      {birthDate ? (
        <ContactLine label="Nac." value={formatBirthDateForDisplay(birthDate)} />
      ) : (
        <EmptyLine label="Nac." />
      )}
    </div>
  );
}
