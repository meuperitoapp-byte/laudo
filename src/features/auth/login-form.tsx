"use client";

import { useState, useTransition } from "react";
import { sendOtp, signInWithPassword } from "@/features/auth/actions";
import { Botao } from "@/components/ui/button";

const ERRO_LINK_INVALIDO =
  "O link de acesso não funcionou — geralmente acontece quando ele é aberto em um navegador ou " +
  "aparelho diferente de onde o e-mail foi pedido (ex.: pediu no computador, abriu no app de e-mail " +
  "do celular). Peça um novo link e abra no mesmo navegador, ou entre com senha abaixo.";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 placeholder:text-nevoa-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-sm font-medium text-nevoa-600 dark:text-nevoa-400 mb-1.5";

export function LoginForm({ erroInicial }: { erroInicial: "link_invalido" | null }) {
  const [modo, setModo] = useState<"link" | "senha">("link");
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(
    erroInicial === "link_invalido" ? ERRO_LINK_INVALIDO : null
  );
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

  function handleSignInWithPassword(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await signInWithPassword(formData);
      // Em caso de sucesso, a action já redireciona no servidor.
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-nevoa-25 dark:bg-nevoa-950 p-8">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900 p-8">
        <div className="text-center space-y-1.5">
          <h1 className="font-title text-xl font-semibold text-petroleo-600 dark:text-petroleo-400">
            Sistema de Laudos Periciais
          </h1>
          <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Dra. Fernanda — acesso restrito</p>
        </div>

        {error && (
          <p className="text-sm rounded-md border border-vinho-600/30 bg-vinho-100 text-vinho-700 dark:border-vinho-400/30 dark:bg-vinho-950 dark:text-vinho-400 px-3 py-2">
            {error}
          </p>
        )}

        {modo === "link" && !sent && (
          <form action={handleSendOtp} className="space-y-4">
            <div>
              <label htmlFor="email" className={labelClass}>
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoFocus
                className={inputClass}
                placeholder="voce@exemplo.com"
              />
            </div>
            <Botao type="submit" carregando={isPending} textoCarregando="Enviando…" className="w-full">
              Enviar link de acesso
            </Botao>
            <button
              type="button"
              onClick={() => {
                setModo("senha");
                setError(null);
              }}
              className="w-full text-center text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400"
            >
              Entrar com senha
            </button>
          </form>
        )}

        {modo === "link" && sent && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-nevoa-600 dark:text-nevoa-400">
              Enviamos um link de acesso para <strong className="text-nevoa-900 dark:text-nevoa-100">{email}</strong>.
              Abra o e-mail e clique no link, no mesmo navegador em que você está agora, para entrar.
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

        {modo === "senha" && (
          <form action={handleSignInWithPassword} className="space-y-4">
            <div>
              <label htmlFor="email_senha" className={labelClass}>
                E-mail
              </label>
              <input
                id="email_senha"
                name="email"
                type="email"
                required
                autoFocus
                className={inputClass}
                placeholder="voce@exemplo.com"
              />
            </div>
            <div>
              <label htmlFor="senha" className={labelClass}>
                Senha
              </label>
              <input id="senha" name="senha" type="password" required className={inputClass} />
            </div>
            <Botao type="submit" carregando={isPending} textoCarregando="Entrando…" className="w-full">
              Entrar
            </Botao>
            <button
              type="button"
              onClick={() => {
                setModo("link");
                setError(null);
              }}
              className="w-full text-center text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400"
            >
              Entrar com link por e-mail
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
