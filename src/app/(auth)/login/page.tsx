"use client";

import { useState, useTransition } from "react";
import { sendOtp } from "@/features/auth/actions";
import { Botao } from "@/components/ui/button";

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
    <main className="flex min-h-screen items-center justify-center bg-nevoa-25 dark:bg-nevoa-950 p-8">
      <div className="w-full max-w-sm space-y-8 rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900 p-8">
        <div className="text-center space-y-1.5">
          <h1 className="font-title text-xl font-semibold text-petroleo-600 dark:text-petroleo-400">
            Sistema de Laudos Periciais
          </h1>
          <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Dra. Fernanda — acesso restrito</p>
        </div>

        {!sent && (
          <form action={handleSendOtp} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-nevoa-600 dark:text-nevoa-400 mb-1.5">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoFocus
                className="w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 placeholder:text-nevoa-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500"
                placeholder="voce@exemplo.com"
              />
            </div>
            {error && <p className="text-sm text-vinho-600 dark:text-vinho-400">{error}</p>}
            <Botao
              type="submit"
              carregando={isPending}
              textoCarregando="Enviando…"
              className="w-full"
            >
              Enviar link de acesso
            </Botao>
          </form>
        )}

        {sent && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-nevoa-600 dark:text-nevoa-400">
              Enviamos um link de acesso para <strong className="text-nevoa-900 dark:text-nevoa-100">{email}</strong>.
              Abra o e-mail e clique no link para entrar.
            </p>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setError(null);
              }}
              className="text-sm text-petroleo-600 hover:underline dark:text-petroleo-400"
            >
              Usar outro e-mail
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
