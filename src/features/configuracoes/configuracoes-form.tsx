"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarAtivoGlobal, salvarContato } from "./actions";
import { Botao } from "@/components/ui/button";
import type { ConfiguracoesRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "placeholder:text-nevoa-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-sm font-medium text-nevoa-700 dark:text-nevoa-300 mb-1.5";

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-6 space-y-4">
      <h2 className="font-title text-base font-semibold text-nevoa-900 dark:text-nevoa-100">{titulo}</h2>
      {children}
    </section>
  );
}

function Mensagem({ m }: { m: { tipo: "ok" | "erro"; texto: string } | null }) {
  if (!m) return null;
  return (
    <p
      className={
        m.tipo === "ok"
          ? "text-sm text-musgo-700 dark:text-musgo-400"
          : "text-sm text-vinho-600 dark:text-vinho-400"
      }
    >
      {m.texto}
    </p>
  );
}

function FormAtivo({
  tipo,
  titulo,
  descricao,
  urlAtual,
}: {
  tipo: "assinatura_perito" | "logomarca";
  titulo: string;
  descricao: string;
  urlAtual: string | null;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      const r = await salvarAtivoGlobal(formData);
      if ("error" in r) {
        setMsg({ tipo: "erro", texto: r.error });
        return;
      }
      setMsg({ tipo: "ok", texto: "Imagem atualizada." });
      router.refresh();
    });
  }

  return (
    <Cartao titulo={titulo}>
      <p className="text-sm text-nevoa-500 dark:text-nevoa-400">{descricao}</p>
      {urlAtual ? (
        <div>
          <span className={labelClass}>Imagem atual</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urlAtual}
            alt={titulo}
            className="max-h-28 rounded-md border border-nevoa-200 dark:border-nevoa-800 bg-white p-2"
          />
        </div>
      ) : (
        <p className="text-sm text-nevoa-400 italic">Nenhuma imagem cadastrada ainda.</p>
      )}
      <form action={onSubmit} className="space-y-3">
        <input type="hidden" name="tipo" value={tipo} />
        <input
          type="file"
          name="arquivo"
          accept="image/png,image/jpeg"
          required
          className="block w-full text-sm text-nevoa-700 dark:text-nevoa-300 file:mr-3 file:rounded-md file:border-0 file:bg-petroleo-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-petroleo-700 hover:file:bg-petroleo-200 dark:file:bg-petroleo-950/60 dark:file:text-petroleo-300"
        />
        <Botao type="submit" carregando={isPending} textoCarregando="Enviando…">
          {urlAtual ? "Substituir" : "Enviar"}
        </Botao>
        <Mensagem m={msg} />
      </form>
    </Cartao>
  );
}

function FormContato({ config }: { config: ConfiguracoesRow | null }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      const r = await salvarContato(formData);
      if ("error" in r) {
        setMsg({ tipo: "erro", texto: r.error });
        return;
      }
      setMsg({ tipo: "ok", texto: "Dados de contato salvos." });
      router.refresh();
    });
  }

  return (
    <Cartao titulo="Dados de contato dos documentos">
      <p className="text-sm text-nevoa-500 dark:text-nevoa-400">
        Vão numa faixa discreta no rodapé de toda página dos laudos e pareceres gerados. Deixe os
        campos de Assistência Técnica em branco para usar os mesmos da Perícia Judicial.
      </p>
      <form action={onSubmit} className="space-y-5">
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-nevoa-700 dark:text-nevoa-300">Perícia Judicial</legend>
          <div>
            <label htmlFor="cj_email" className={labelClass}>E-mail</label>
            <input id="cj_email" name="contato_judicial_email" type="email" defaultValue={config?.contato_judicial_email ?? ""} className={inputClass} />
          </div>
          <div>
            <label htmlFor="cj_tel" className={labelClass}>Telefone</label>
            <input id="cj_tel" name="contato_judicial_telefone" defaultValue={config?.contato_judicial_telefone ?? ""} className={inputClass} />
          </div>
          <div>
            <label htmlFor="cj_ig" className={labelClass}>Instagram</label>
            <input id="cj_ig" name="contato_judicial_instagram" placeholder="drafernandanascimento_" defaultValue={config?.contato_judicial_instagram ?? ""} className={inputClass} />
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-nevoa-700 dark:text-nevoa-300">
            Assistência Técnica <span className="font-normal text-nevoa-400">(opcional)</span>
          </legend>
          <div>
            <label htmlFor="cat_email" className={labelClass}>E-mail</label>
            <input id="cat_email" name="contato_at_email" type="email" defaultValue={config?.contato_at_email ?? ""} className={inputClass} />
          </div>
          <div>
            <label htmlFor="cat_tel" className={labelClass}>Telefone</label>
            <input id="cat_tel" name="contato_at_telefone" defaultValue={config?.contato_at_telefone ?? ""} className={inputClass} />
          </div>
          <div>
            <label htmlFor="cat_ig" className={labelClass}>Instagram</label>
            <input id="cat_ig" name="contato_at_instagram" defaultValue={config?.contato_at_instagram ?? ""} className={inputClass} />
          </div>
        </fieldset>

        <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
          Salvar contato
        </Botao>
        <Mensagem m={msg} />
      </form>
    </Cartao>
  );
}

export function ConfiguracoesForm({
  config,
  urlAssinatura,
  urlLogomarca,
}: {
  config: ConfiguracoesRow | null;
  urlAssinatura: string | null;
  urlLogomarca: string | null;
}) {
  return (
    <div className="space-y-6">
      <FormAtivo
        tipo="assinatura_perito"
        titulo="Assinatura da perita"
        descricao="Imagem da assinatura inserida acima do nome no fim de cada laudo (PNG com fundo transparente fica melhor)."
        urlAtual={urlAssinatura}
      />
      <FormAtivo
        tipo="logomarca"
        titulo="Logomarca"
        descricao="Aparece pequena na faixa de identidade do rodapé de toda página dos documentos gerados."
        urlAtual={urlLogomarca}
      />
      <FormContato config={config} />
    </div>
  );
}
