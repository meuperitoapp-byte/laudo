"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Paperclip, Download, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { enviarMensagem } from "./actions";
import { BUCKET_CHAT_ARQUIVOS, TAMANHO_MAXIMO_ARQUIVO_BYTES } from "./constants";
import { AvatarCirculo } from "@/features/perfil/avatar-form";
import { Botao } from "@/components/ui/button";
import type { ChatMensagensRow } from "@/types/database";

const dataHoraCurta = (iso: string) => {
  const d = new Date(iso);
  const hoje = new Date();
  const mesmoData = d.toDateString() === hoje.toDateString();
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return mesmoData ? hora : `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${hora}`;
};

function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Cor fixa por pessoa (categórica, ordem fixa — ver globals.css --pessoa-1..5) — nunca só a cor: o nome sempre aparece por extenso ao lado. */
function corDoAutor(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
  return `var(--pessoa-${(hash % 5) + 1})`;
}

interface GrupoMensagens {
  autorEmail: string;
  itens: ChatMensagensRow[];
}

/** Agrupa mensagens seguidas da MESMA pessoa (referência: WhatsApp/Telegram) — avatar e nome aparecem uma vez só por grupo, não por mensagem. */
function agruparMensagens(mensagens: ChatMensagensRow[]): GrupoMensagens[] {
  const grupos: GrupoMensagens[] = [];
  for (const m of mensagens) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.autorEmail === m.autor_email) ultimo.itens.push(m);
    else grupos.push({ autorEmail: m.autor_email, itens: [m] });
  }
  return grupos;
}

/**
 * Chat interno — sala única, geral, sem canais nem DM (pedido da Dra.
 * Fernanda, 24/09/2026). Tempo real de verdade via Supabase Realtime.
 *
 * Redesenho de UX (30/09/2026, print dela: "isso aí está muito amador
 * ainda") — altura quase de tela toda, foto de perfil (ou círculo colorido
 * com inicial quando não há foto), cor fixa por pessoa, nome sempre visível,
 * e anexo de arquivo/documento.
 *
 * Eco otimista — `enviarMensagem` devolve a linha criada, que entra na lista
 * IMEDIATAMENTE; o handler do Realtime ignora qualquer INSERT cujo `id` já
 * esteja na lista (o próprio eco voltando), então nunca duplica.
 */
export function ChatPanel({
  mensagensIniciais,
  meuEmail,
  meuNome,
  nomesResponsaveis,
  avatares,
}: {
  mensagensIniciais: ChatMensagensRow[];
  meuEmail: string;
  meuNome: string;
  nomesResponsaveis: string[];
  /** email -> URL pública da foto de perfil (só quem tem foto cadastrada entra aqui). */
  avatares: Record<string, string>;
}) {
  const [mensagens, setMensagens] = useState(mensagensIniciais);
  const [texto, setTexto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [mencionadoNome, setMencionadoNome] = useState("");
  const [soMinhasMencoes, setSoMinhasMencoes] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [urlsAnexos, setUrlsAnexos] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const fimDaListaRef = useRef<HTMLDivElement>(null);
  const inputArquivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const canal = supabase
      .channel("chat_mensagens")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_mensagens" },
        (payload) => {
          const nova = payload.new as ChatMensagensRow;
          setMensagens((atual) => (atual.some((m) => m.id === nova.id) ? atual : [...atual, nova]));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  // Bucket de anexos é privado — URL assinada gerada sob demanda no cliente,
  // uma vez por arquivo novo (nunca reassinada de novo depois de já ter uma).
  useEffect(() => {
    const pendentes = mensagens.filter((m) => m.arquivo_path && !urlsAnexos[m.arquivo_path]);
    if (pendentes.length === 0) return;
    const supabase = createClient();
    (async () => {
      const novasUrls: Record<string, string> = {};
      for (const m of pendentes) {
        const { data } = await supabase.storage.from(BUCKET_CHAT_ARQUIVOS).createSignedUrl(m.arquivo_path!, 3600);
        if (data?.signedUrl) novasUrls[m.arquivo_path!] = data.signedUrl;
      }
      if (Object.keys(novasUrls).length > 0) setUrlsAnexos((atual) => ({ ...atual, ...novasUrls }));
    })();
  }, [mensagens, urlsAnexos]);

  const mensagensVisiveis = useMemo(
    () => (soMinhasMencoes ? mensagens.filter((m) => m.mencionado_nome === meuNome) : mensagens),
    [mensagens, soMinhasMencoes, meuNome],
  );

  useEffect(() => {
    fimDaListaRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagensVisiveis.length]);

  function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > TAMANHO_MAXIMO_ARQUIVO_BYTES) {
      setErro("Arquivo maior que 25MB — não é possível enviar.");
      e.target.value = "";
      return;
    }
    setErro(null);
    setArquivo(f);
  }

  function enviar(formData: FormData) {
    setErro(null);
    const textoEnviado = texto;
    const arquivoEnviado = arquivo;
    const mencionadoEnviado = mencionadoNome;
    if (arquivo) formData.set("arquivo", arquivo);
    setTexto("");
    setArquivo(null);
    setMencionadoNome("");
    if (inputArquivoRef.current) inputArquivoRef.current.value = "";
    startTransition(async () => {
      const resultado = await enviarMensagem(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        setTexto(textoEnviado);
        setArquivo(arquivoEnviado);
        setMencionadoNome(mencionadoEnviado);
        return;
      }
      setMensagens((atual) => (atual.some((m) => m.id === resultado.mensagem.id) ? atual : [...atual, resultado.mensagem]));
    });
  }

  const grupos = useMemo(() => agruparMensagens(mensagensVisiveis), [mensagensVisiveis]);

  return (
    <div className="flex flex-col rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 h-[calc(100vh-150px)]">
      <div className="flex items-center justify-end gap-2 border-b border-nevoa-200 dark:border-nevoa-800 px-4 py-2.5">
        <label className="flex items-center gap-1.5 text-xs text-nevoa-600 dark:text-nevoa-400">
          <input type="checkbox" checked={soMinhasMencoes} onChange={(e) => setSoMinhasMencoes(e.target.checked)} />
          Só minhas menções
        </label>
      </div>

      <ul className="flex-1 overflow-y-auto p-4 space-y-3">
        {grupos.length === 0 && (
          <p className="text-sm text-nevoa-500 dark:text-nevoa-400 text-center py-8">
            {soMinhasMencoes ? "Nenhuma mensagem te mencionou ainda." : "Nenhuma mensagem ainda — escreva a primeira."}
          </p>
        )}
        {grupos.map((grupo) => {
          const minha = grupo.autorEmail === meuEmail;
          const cor = corDoAutor(grupo.autorEmail);
          const urlAvatar = avatares[grupo.autorEmail] ?? null;
          const nomeAutor = grupo.itens[0].autor_nome;

          return (
            <li key={grupo.itens[0].id} className={`flex items-end gap-2 ${minha ? "flex-row-reverse" : "flex-row"}`}>
              <AvatarCirculo url={urlAvatar} nome={nomeAutor} tamanho={32} />
              <div className={`max-w-[65%] flex flex-col gap-0.5 ${minha ? "items-end" : "items-start"}`}>
                <p className="text-xs font-medium px-1" style={{ color: cor }}>
                  {nomeAutor}
                </p>
                {grupo.itens.map((m, indice) => {
                  const primeira = indice === 0;
                  const ultima = indice === grupo.itens.length - 1;
                  const urlAnexo = m.arquivo_path ? urlsAnexos[m.arquivo_path] : null;
                  const anexoEhImagem = m.arquivo_tipo?.startsWith("image/") ?? false;
                  // Cantos "internos" (do lado do avatar) ficam menos arredondados
                  // no meio de um grupo, pra ler como uma sequência só — mesma
                  // referência do WhatsApp/Telegram: só o topo do 1º e a base do
                  // último bloco ficam com o canto cheio.
                  const ladoInterno = minha ? "r" : "l";
                  const arredondamento = [
                    "rounded-2xl",
                    !primeira ? `rounded-t${ladoInterno}-md` : "",
                    !ultima ? `rounded-b${ladoInterno}-md` : "",
                  ].filter(Boolean).join(" ");

                  return (
                    <div
                      key={m.id}
                      className={`${arredondamento} px-3.5 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 ${minha ? "border-r-2" : "border-l-2"}`}
                      style={{
                        backgroundColor: `color-mix(in srgb, ${cor} 20%, transparent)`,
                        borderColor: cor,
                      }}
                    >
                      {m.mencionado_nome && (
                        <p className="text-[11px] font-medium mb-0.5" style={{ color: cor }}>
                          @{m.mencionado_nome}
                        </p>
                      )}
                      {m.texto && <p className="whitespace-pre-wrap break-words">{m.texto}</p>}
                      {m.arquivo_path && (
                        <div className={m.texto ? "mt-2 pt-2 border-t border-nevoa-300/40 dark:border-nevoa-600/40" : ""}>
                          {anexoEhImagem && urlAnexo ? (
                            <a href={urlAnexo} target="_blank" rel="noopener noreferrer">
                              {/* eslint-disable-next-line @next/next/no-img-element -- anexo enviado por upload, URL assinada dinâmica (não cabe no next/image) */}
                              <img src={urlAnexo} alt={m.arquivo_nome ?? "imagem anexada"} className="max-w-full max-h-64 rounded-lg" />
                            </a>
                          ) : (
                            <a
                              href={urlAnexo ?? "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs underline text-petroleo-700 dark:text-petroleo-400"
                            >
                              <Download className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{m.arquivo_nome}</span>
                              {m.arquivo_tamanho_bytes != null && <span className="shrink-0 opacity-75">({tamanhoLegivel(m.arquivo_tamanho_bytes)})</span>}
                            </a>
                          )}
                        </div>
                      )}
                      <p className="text-[11px] mt-1 text-right opacity-60">{dataHoraCurta(m.created_at)}</p>
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
        <div ref={fimDaListaRef} />
      </ul>

      <form action={enviar} className="border-t border-nevoa-200 dark:border-nevoa-800 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs text-nevoa-500 dark:text-nevoa-400 shrink-0">Direcionar para:</label>
          <select
            name="mencionado_nome"
            value={mencionadoNome}
            onChange={(e) => setMencionadoNome(e.target.value)}
            className="rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-2 py-1 text-xs text-nevoa-900 dark:text-nevoa-100"
          >
            <option value="">Ninguém (mensagem geral)</option>
            {nomesResponsaveis.map((nome) => (
              <option key={nome} value={nome}>{nome}</option>
            ))}
          </select>
        </div>
        {arquivo && (
          <div className="flex items-center gap-2 rounded-md border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-25 dark:bg-nevoa-950/40 px-2.5 py-1.5 text-xs text-nevoa-700 dark:text-nevoa-300 w-fit">
            <Paperclip className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate max-w-[200px]">{arquivo.name}</span>
            <span className="text-nevoa-500 dark:text-nevoa-400 shrink-0">({tamanhoLegivel(arquivo.size)})</span>
            <button type="button" onClick={() => { setArquivo(null); if (inputArquivoRef.current) inputArquivoRef.current.value = ""; }} className="shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => inputArquivoRef.current?.click()}
            className="shrink-0 rounded-md border border-nevoa-300 dark:border-nevoa-700 p-2 text-nevoa-600 dark:text-nevoa-400 hover:bg-nevoa-100 dark:hover:bg-nevoa-800"
            title="Anexar arquivo"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input ref={inputArquivoRef} type="file" onChange={aoEscolherArquivo} className="hidden" />
          <textarea
            name="texto"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            rows={1}
            placeholder="Escreva uma mensagem…"
            className="flex-1 resize-none rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500"
          />
          <Botao type="submit" carregando={isPending} textoCarregando="Enviando…">
            Enviar
          </Botao>
        </div>
      </form>
      {erro && <p className="px-3 pb-2 text-xs text-vinho-600 dark:text-vinho-400">{erro}</p>}
    </div>
  );
}
