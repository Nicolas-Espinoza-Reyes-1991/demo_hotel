export type PasswordRuleId =
  | "minLength"
  | "uppercase"
  | "lowercase"
  | "number"
  | "special"
  | "noSpaces";

export type PasswordRule = {
  id: PasswordRuleId;
  label: string;
  test: (password: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "minLength",
    label: "Al menos 8 caracteres",
    test: (password) => password.length >= 8,
  },
  {
    id: "uppercase",
    label: "Una letra mayúscula",
    test: (password) => /[A-ZÁÉÍÓÚÑ]/.test(password),
  },
  {
    id: "lowercase",
    label: "Una letra minúscula",
    test: (password) => /[a-záéíóúñ]/.test(password),
  },
  {
    id: "number",
    label: "Un número",
    test: (password) => /\d/.test(password),
  },
  {
    id: "special",
    label: "Un carácter especial (!@#$%&*)",
    test: (password) => /[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9\s]/.test(password),
  },
  {
    id: "noSpaces",
    label: "Sin espacios",
    test: (password) => password.length > 0 && !/\s/.test(password),
  },
];

export type PasswordStrength = "empty" | "weak" | "medium" | "strong";

export function evaluatePassword(password: string) {
  const results = PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    ok: rule.test(password),
  }));
  const passed = results.filter((rule) => rule.ok).length;
  const valid = results.every((rule) => rule.ok);

  let strength: PasswordStrength = "empty";
  if (password.length > 0) {
    if (passed <= 2) strength = "weak";
    else if (passed <= 4) strength = "medium";
    else strength = "strong";
  }

  return { results, passed, valid, strength };
}

export function passwordsMatch(password: string, confirm: string): boolean {
  return password.length > 0 && password === confirm;
}

export function getPasswordValidationError(password: string, confirm?: string): string | null {
  const { valid, results } = evaluatePassword(password);
  if (!valid) {
    const failed = results.find((rule) => !rule.ok);
    return failed ? `La contraseña debe cumplir: ${failed.label.toLowerCase()}.` : "Contraseña inválida.";
  }
  if (confirm !== undefined && !passwordsMatch(password, confirm)) {
    return "Las contraseñas no coinciden.";
  }
  return null;
}

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 32;
export const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

export function getUsernameValidationError(username: string): string | null {
  const value = username.trim();
  if (value.length < USERNAME_MIN) return `El usuario debe tener al menos ${USERNAME_MIN} caracteres.`;
  if (value.length > USERNAME_MAX) return `El usuario no puede superar ${USERNAME_MAX} caracteres.`;
  if (!USERNAME_PATTERN.test(value)) {
    return "El usuario solo puede contener letras, números, punto, guion y guion bajo.";
  }
  return null;
}
