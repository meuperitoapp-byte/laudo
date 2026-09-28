"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadAvatar } from "./actions";
import { Botao } from "@/components/ui/button";

/** Círculo com foto, ou iniciais num fundo colorido quando não há foto — mesmo fallback usado no chat. */
export function AvatarCirculo({ url, nome, tamanho = 40 }: { url: string | null; nome: string; tamanho?: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- fotos de perfil enviadas pelo usuário, não fazem parte do build (next/image exigiria configurar domínio remoto pro Storage público)
    return <img src={url} alt={nome} width={tamanho} height={tamanho} className="rounded-full object-cover shrink-0" style={{ width: tamanho, height: tamanho }} />;
  }
  const inicial = nome.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className="rounded-full bg-petroleo-600 dark:bg-petroleo-500 text-white flex items-center justify-center font-semibold shrink-0"
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.42 }}
    >
      {inicial}
    </div>
  );
}

/** Upload da própria foto de perfil — usado em Configurações. */
export function AvatarForm({ urlAtual, meuNome }: { urlAtual: string | null; meuNome: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setPreview(URL.createObjectURL(arquivo));
    setErro(null);
    setOk(false);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("arquivo", arquivo);
      const resultado = await uploadAvatar(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        setPreview(null);
        return;
      }
      setOk(true);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-4">
      <AvatarCirculo url={preview ?? urlAtual} nome={meuNome} tamanho={56} />
      <div>
        <Botao type="button" variante="secundaria" onClick={() => inputRef.current?.click()} carregando={isPending} textoCarregando="Enviando…">
          {urlAtual ? "Trocar foto" : "Adicionar foto"}
        </Botao>
        <input ref={inputRef} type="file" accept="image/*" onChange={aoEscolherArquivo} className="hidden" />
        {ok && <p className="text-xs text-musgo-600 dark:text-musgo-400 mt-1">Salvo.</p>}
        {erro && <p className="text-xs text-vinho-600 dark:text-vinho-400 mt-1">{erro}</p>}
      </div>
    </div>
  );
}
