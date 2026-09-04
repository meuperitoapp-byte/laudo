import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_DOCUMENTOS } from "@/features/documentos/constants";
import { RegistroDemandaForm } from "@/features/pos-laudo/registro-demanda-form";
import { MatrizPontos, type EvidenciaVinculo } from "@/features/pos-laudo/matriz-pontos";
import {
  DocumentosSupervenientes,
  type DocSuperveniente,
} from "@/features/pos-laudo/documentos-supervenientes";
import { conclusaoVigenteAtual } from "@/features/pos-laudo/consultas";
import { CICLO_STATUS_ROTULOS, FLUXO_ROTULOS } from "@/features/pos-laudo/rotulos";
import type { PosLaudoCicloStatus, PosLaudoFluxo } from "@/types/enums";

const URL_ASSINADA_VALIDADE_SEGUNDOS = 60 * 60;

export default async function PosLaudoCicloPage({
  params,
}: {
  params: Promise<{ id: string; cicloId: string }>;
}) {
  const { id: processoId, cicloId } = await params;
  const supabase = await createClient();

  const { data: ciclo } = await supabase
    .from("pos_laudo_ciclos")
    .select("*")
    .eq("id", cicloId)
    .eq("processo_id", processoId)
    .single();
  if (!ciclo) {
    notFound();
  }

  const [{ data: documentos }, { data: pontos }] = await Promise.all([
    supabase
      .from("documentos")
      .select("id, nome_arquivo")
      .eq("processo_id", processoId)
      .eq("tipo", "documento_processual")
      .order("ordem", { ascending: true }),
    supabase
      .from("pos_laudo_pontos")
      .select("*")
      .eq("ciclo_id", cicloId)
      .order("ordem", { ascending: true }),
  ]);

  // Documentos supervenientes do ciclo. Metadados em pos_laudo_documentos, o
  // arquivo em documentos (resolvido em consulta à parte + signed URL).
  const { data: pldDb } = await supabase
    .from("pos_laudo_documentos")
    .select("*")
    .eq("ciclo_id", cicloId)
    .order("created_at", { ascending: true });
  const pldLista = pldDb ?? [];

  const docsSupervenientes: DocSuperveniente[] = [];
  if (pldLista.length > 0) {
    const { data: docsDb } = await supabase
      .from("documentos")
      .select("id, nome_arquivo, storage_path")
      .in(
        "id",
        pldLista.map((p) => p.documento_id),
      );
    const docPorId = new Map((docsDb ?? []).map((d) => [d.id, d]));

    const caminhos = (docsDb ?? []).map((d) => d.storage_path);
    let urlSup = new Map<string, string | null>();
    if (caminhos.length > 0) {
      const { data: assinadas } = await supabase.storage
        .from(BUCKET_DOCUMENTOS)
        .createSignedUrls(caminhos, URL_ASSINADA_VALIDADE_SEGUNDOS);
      if (assinadas) urlSup = new Map(assinadas.map((a) => [a.path ?? "", a.signedUrl]));
    }

    for (const p of pldLista) {
      const d = docPorId.get(p.documento_id);
      docsSupervenientes.push({
        pld_id: p.id,
        documento_id: p.documento_id,
        nome_arquivo: d?.nome_arquivo ?? "(documento removido)",
        signed_url: d ? (urlSup.get(d.storage_path) ?? null) : null,
        papel: p.papel,
        apresentante: p.apresentante,
        data_juntada: p.data_juntada,
        paginas: p.paginas,
        existencia_previa: p.existencia_previa,
        disponivel_ao_perito_antes: p.disponivel_ao_perito_antes,
        relevancia: p.relevancia,
        impacto: p.impacto,
        observacao_tecnica: p.observacao_tecnica,
        ja_enfrentado: p.ja_enfrentado,
      });
    }
  }

  const conclusaoVigente = await conclusaoVigenteAtual(supabase, processoId);

  const pontosLista = pontos ?? [];
  let evidenciasPorPonto: Record<string, EvidenciaVinculo[]> = {};
  if (pontosLista.length > 0) {
    const { data: evidencias } = await supabase
      .from("pos_laudo_ponto_evidencias")
      .select("id, ponto_id, documento_id, observacao")
      .in(
        "ponto_id",
        pontosLista.map((p) => p.id),
      );
    evidenciasPorPonto = (evidencias ?? []).reduce<Record<string, EvidenciaVinculo[]>>((acc, e) => {
      (acc[e.ponto_id] ??= []).push({
        id: e.id,
        documento_id: e.documento_id,
        observacao: e.observacao,
      });
      return acc;
    }, {});
  }

  return (
    <main className="p-8 max-w-2xl space-y-8">
      <Link
        href={`/processos/${processoId}/pos-laudo`}
        className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400"
      >
        ← Voltar para os ciclos
      </Link>

      <div className="space-y-1">
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">
          Ciclo {ciclo.numero_ciclo} — pós-laudo
        </h1>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">
          Fluxo: {FLUXO_ROTULOS[ciclo.fluxo as PosLaudoFluxo] ?? ciclo.fluxo} · Status:{" "}
          {CICLO_STATUS_ROTULOS[ciclo.status as PosLaudoCicloStatus] ?? ciclo.status}
        </p>
        <p className="text-xs text-nevoa-400 dark:text-nevoa-600">
          O fluxo vem do tipo de trabalho do processo e não muda. As etapas de resposta (matriz de
          enfrentamento, documentos supervenientes, quesitos, geração) entram nas fatias seguintes.
        </p>
      </div>

      <RegistroDemandaForm
        processoId={processoId}
        ciclo={{
          id: ciclo.id,
          data_intimacao: ciclo.data_intimacao,
          prazo: ciclo.prazo,
          origem: ciclo.origem,
          natureza: ciclo.natureza as string[] | null,
          documento_intimacao_id: ciclo.documento_intimacao_id,
        }}
        documentos={documentos ?? []}
      />

      <DocumentosSupervenientes processoId={processoId} cicloId={ciclo.id} docs={docsSupervenientes} />

      <MatrizPontos
        processoId={processoId}
        cicloId={ciclo.id}
        podeModificarConclusao={ciclo.pode_modificar_conclusao}
        rascunhoComplementacao={ciclo.rascunho_complementacao}
        repercussaoLaudo={ciclo.repercussao_laudo}
        conclusaoVigenteNova={ciclo.conclusao_vigente_nova}
        conclusaoVigente={
          conclusaoVigente
            ? {
                texto: conclusaoVigente.texto,
                origem_tipo: conclusaoVigente.origem_tipo,
                ciclo_id: conclusaoVigente.ciclo_id,
              }
            : null
        }
        pontos={pontosLista}
        evidenciasPorPonto={evidenciasPorPonto}
        documentos={documentos ?? []}
      />
    </main>
  );
}
