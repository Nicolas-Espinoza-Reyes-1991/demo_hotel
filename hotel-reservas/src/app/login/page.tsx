"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { apiPath } from "@/lib/api-path";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiPath("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo iniciar sesión.");
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/55 bg-white/50 shadow-[0_28px_90px_-35px_rgba(61,43,31,0.42)] backdrop-blur-[3px] lg:grid-cols-[0.92fr_1.08fr]">
      <aside className="relative hidden min-h-[36rem] overflow-hidden bg-brand-100 lg:block">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-90"
          style={{ backgroundImage: `url('${apiPath("/bg-recepcion.webp")}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-100/80 via-brand-100/42 to-accent/18" />
        <div className="relative z-10 flex h-full flex-col justify-between p-8 text-brand-900">
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/25 bg-white/12 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] backdrop-blur-sm">
            Administración
          </div>

          <div className="space-y-5">
            <p className="font-display text-4xl font-bold italic leading-tight text-white drop-shadow">
              Gestión cálida para una experiencia boutique.
            </p>
            <p className="max-w-sm text-sm leading-6 text-white/82">
              Controla reservas, habitaciones y disponibilidad desde un acceso privado diseñado para La Casona de Futrono.
            </p>
          </div>

          <div className="flex items-center gap-3 text-sm font-semibold text-white/85">
            <span className="h-px w-10 bg-white/45" />
            La Casona de Futrono
          </div>
        </div>
      </aside>

      <div className="bg-white/82 px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-3xl border border-highlight/25 bg-white/78 shadow-[0_14px_35px_-20px_rgba(61,43,31,0.4)]">
              <img
                src={apiPath("/logo-casona.webp")}
                alt="La Casona de Futrono"
                className="h-14 w-14 object-contain"
              />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold">Acceso privado</p>
            <h1 className="mt-2 font-display text-4xl font-bold italic leading-none text-brand-100">
              Panel administrativo
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-brand-500">
              Ingresa al espacio de gestión de reservas y habitaciones de La Casona de Futrono.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-highlight/20 bg-white/88 p-5 shadow-[0_18px_45px_-30px_rgba(61,43,31,0.42)] sm:p-6">
            {error && <div className="alert-error">{error}</div>}

            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-semibold text-brand-100">
                Usuario
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="input-field bg-white/92"
                placeholder="admin"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-brand-100">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input-field bg-white/92"
                placeholder="••••••••"
              />
              <label
                htmlFor="show-password"
                className="mt-3 flex w-fit cursor-pointer items-center gap-2.5 rounded-lg px-0.5 py-1 text-sm font-medium text-brand-100 select-none hover:text-accent"
              >
                <input
                  id="show-password"
                  type="checkbox"
                  checked={showPassword}
                  onChange={(event) => setShowPassword(event.target.checked)}
                  className="h-4 w-4 shrink-0 cursor-pointer rounded border-brand-600 accent-[#5c4033]"
                />
                Mostrar contraseña
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary min-h-11 w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Ingresando…" : "Ingresar al panel"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-brand-500">
            <Link href="/" className="font-semibold text-accent hover:text-accent-hover">
              ← Volver al motor de reservas
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8 sm:py-10">
      <Suspense fallback={<div className="glass-panel h-96 w-full max-w-5xl animate-pulse bg-brand-800" />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
