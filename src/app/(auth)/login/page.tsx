"use client";

import { useState, useTransition } from "react";
import { sendOtp } from "@/features/auth/actions";

export default function LoginPage() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSendOtp(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await sendOtp(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setEmail((formData.get("email") as string).trim());
      setSent(true);
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold">Sistema de Laudos Periciais</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Dra. Fernanda — acesso restrito
          </p>
        </div>

        {!sent && (
          <form action={handleSendOtp} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoFocus
                className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                placeholder="voce@exemplo.com"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded bg-foreground text-background py-2 font-medium disabled:opacity-50"
            >
              {isPending ? "Enviando..." : "Enviar link de acesso"}
            </button>
          </form>
        )}

        {sent && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Enviamos um link de acesso para <strong>{email}</strong>. Abra o
              e-mail e clique no link para entrar.
            </p>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setError(null);
              }}
              className="text-sm underline text-zinc-600 dark:text-zinc-400"
            >
              Usar outro e-mail
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
