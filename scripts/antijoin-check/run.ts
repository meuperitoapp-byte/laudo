/**
 * Verificação do anti-join do Módulo Pós-Laudo (compilarLaudo, src/features/
 * geracao-laudo/compilar.ts): um documento superveniente anexado num ciclo de
 * pós-laudo NUNCA pode entrar na Matriz de Documentos Analisados nem na
 * contagem de um laudo gerado depois — nem no processo original, nem em
 * versões futuras.
 *
 * Roda as MESMAS Server Actions que a tela usa (import direto dos módulos
 * reais), só substituindo — via tsconfig.script.json — a construção do
 * client Supabase (que normalmente depende de cookies de uma requisição
 * Next.js) por um client com a service role key, e os módulos next/cache e
 * next/navigation por no-ops. Nenhuma lógica de negócio é reimplementada.
 *
 * Usa um processo de TESTE já existente (f9d9e4e6-…, "João da Silva Teste"),
 * e desfaz no final (SEMPRE — try/finally, mesmo se algo falhar no meio) tudo
 * que este script cria: documentos, respostas_secao (stub), laudos_gerados,
 * ciclo de pós-laudo e conclusão vigente. O processo em si não é tocado além
 * disso.
 *
 * Rodar: npx tsx --tsconfig scripts/antijoin-check/tsconfig.script.json scripts/antijoin-check/run.ts
 */
import { createClient } from "./shims/supabase-server";
import { uploadDocumento } from "@/features/documentos/actions";
import { gerarLaudo, marcarLaudoProtocolado } from "@/features/geracao-laudo/actions";
import { compilarLaudo } from "@/features/geracao-laudo/compilar";
import {
  definirConclusaoVigenteInicial,
  abrirCicloPosLaudo,
  adicionarDocumentoSuperveniente,
} from "@/features/pos-laudo/actions";

const PROCESSO_ID = "f9d9e4e6-5dd6-4463-b320-481e326d73ea"; // "João da Silva Teste" — processo de teste já existente

const PDF_MINIMO = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n" +
    "xref\n0 4\n0000000000 65535 f \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n0\n%%EOF",
  "utf8",
);

function arquivoFake(nome: string): File {
  return new File([PDF_MINIMO], nome, { type: "application/pdf" });
}

function linha(sep = "-") {
  console.log(sep.repeat(78));
}

async function extrairTabelaDocumentos(processoId: string) {
  const resultado = await compilarLaudo(processoId);
  if (resultado.status !== "ok") {
    throw new Error(`compilarLaudo não retornou "ok": ${JSON.stringify(resultado)}`);
  }
  const secaoMatriz = resultado.modelo.secoes.find((s) => s.codigo === "matriz_documentos_analisados");
  const tabela = secaoMatriz?.blocos.find((b) => b.tipo === "tabela");
  if (!tabela || tabela.tipo !== "tabela") {
    return { totalDocs: 0, nomes: [] as string[] };
  }
  return { totalDocs: tabela.linhas.length, nomes: tabela.linhas.map((l) => l[0]) };
}

/** Apaga TUDO ligado a este processo de teste que a verificação pode ter criado, consultando o banco de novo (não confia em variáveis locais) — roda no finally, então precisa ser robusta mesmo se o script parou no meio. */
async function limparTudo(supabase: Awaited<ReturnType<typeof createClient>>, secaoIdEncerramento: string) {
  const { data: ciclos } = await supabase.from("pos_laudo_ciclos").select("id").eq("processo_id", PROCESSO_ID);
  for (const c of ciclos ?? []) {
    await supabase.from("pos_laudo_documentos").delete().eq("ciclo_id", c.id);
  }
  await supabase.from("pos_laudo_conclusoes_vigentes").delete().eq("processo_id", PROCESSO_ID);
  if (ciclos && ciclos.length > 0) {
    await supabase.from("pos_laudo_ciclos").delete().eq("processo_id", PROCESSO_ID);
  }

  const { data: laudos } = await supabase
    .from("laudos_gerados")
    .select("id, storage_path_pdf, storage_path_docx")
    .eq("processo_id", PROCESSO_ID);
  for (const l of laudos ?? []) {
    const paths = [l.storage_path_pdf, l.storage_path_docx].filter((p): p is string => Boolean(p));
    if (paths.length > 0) await supabase.storage.from("laudos-gerados").remove(paths);
  }
  if (laudos && laudos.length > 0) {
    await supabase.from("laudos_gerados").delete().eq("processo_id", PROCESSO_ID);
  }

  const { data: docs } = await supabase.from("documentos").select("id, storage_path").eq("processo_id", PROCESSO_ID);
  for (const d of docs ?? []) {
    await supabase.storage.from("documentos-processos").remove([d.storage_path]);
  }
  if (docs && docs.length > 0) {
    await supabase.from("documentos").delete().eq("processo_id", PROCESSO_ID);
  }

  // Preserva só a resposta original de "Encerramento" — apaga qualquer outro stub.
  const { data: todasRespostas } = await supabase
    .from("respostas_secao")
    .select("id, secao_id")
    .eq("processo_id", PROCESSO_ID);
  const paraApagar = (todasRespostas ?? []).filter((r) => r.secao_id !== secaoIdEncerramento).map((r) => r.id);
  if (paraApagar.length > 0) {
    await supabase.from("respostas_secao").delete().in("id", paraApagar);
  }

  return {
    ciclos: ciclos?.length ?? 0,
    laudos: laudos?.length ?? 0,
    documentos: docs?.length ?? 0,
    respostasSecao: paraApagar.length,
  };
}

async function main() {
  const supabase = await createClient();
  console.log(`Processo de teste: ${PROCESSO_ID} (João da Silva Teste — previdenciário)\n`);

  const { data: processo } = await supabase.from("processos").select("tipo_laudo_id").eq("id", PROCESSO_ID).single();
  const { data: secaoEncerramento } = await supabase
    .from("secoes")
    .select("id")
    .eq("tipo_laudo_id", processo!.tipo_laudo_id!)
    .eq("codigo", "encerramento")
    .single();

  // Estado zerado ANTES de começar — se sobrou algo de uma tentativa
  // anterior que travou no meio, limpa antes de rodar, pra não contaminar
  // a contagem desta rodada com resíduo de outra.
  await limparTudo(supabase, secaoEncerramento!.id);

  let laudoV1Id: string | null = null;
  let laudoV1Path: string | null = null;
  let laudoV2Path: string | null = null;
  let antesV1 = { totalDocs: 0, nomes: [] as string[] };
  let antesV2 = { totalDocs: 0, nomes: [] as string[] };

  try {
    // ---- Preparação: garante que NENHUMA seção fique "pendente_revisao" ----
    // Várias seções deste tipo_laudo resolvem texto (via placeholders do
    // próprio processo, ex. {{objeto_pericia}}) mesmo sem nenhum campo
    // respondido — e por isso exigem respostas_secao salva, igual exigiria
    // na tela real depois de ela revisar cada seção. Pré-requisito de
    // QUALQUER geração de laudo deste processo, sem relação com o
    // anti-join em si — simula "ela já revisou tudo" de uma vez.
    const { data: todasSecoes } = await supabase
      .from("secoes")
      .select("id, codigo")
      .eq("tipo_laudo_id", processo!.tipo_laudo_id!);
    for (const s of todasSecoes ?? []) {
      if (s.id === secaoEncerramento!.id) continue; // já tem resposta real, não mexe
      const { error } = await supabase.from("respostas_secao").insert({
        processo_id: PROCESSO_ID,
        secao_id: s.id,
        texto_narrativo: `[teste anti-join] Seção "${s.codigo}" revisada apenas para viabilizar a geração nesta verificação.`,
      });
      if (error) throw new Error(`Falha ao preparar respostas_secao (${s.codigo}): ${error.message}`);
    }
    console.log(`Preparação: seções marcadas como revisadas (stub, só pra destravar a geração).`);

    // ---- Passo 1: sobe 2 documentos "originais" e gera o laudo v1 ----
    linha("=");
    console.log("PASSO 1 — Upload de 2 documentos originais + geração do laudo v1");
    linha("=");

    const doc1Form = new FormData();
    doc1Form.set("arquivo", arquivoFake("Exame-Complementar-Original-A.pdf"));
    doc1Form.set("tipo", "documento_processual");
    const doc1 = await uploadDocumento(PROCESSO_ID, doc1Form);
    if (doc1 && "error" in doc1) throw new Error(`Falha no upload do documento 1: ${doc1.error}`);

    const doc2Form = new FormData();
    doc2Form.set("arquivo", arquivoFake("Laudo-Medico-Anterior-Original-B.pdf"));
    doc2Form.set("tipo", "documento_processual");
    const doc2 = await uploadDocumento(PROCESSO_ID, doc2Form);
    if (doc2 && "error" in doc2) throw new Error(`Falha no upload do documento 2: ${doc2.error}`);

    antesV1 = await extrairTabelaDocumentos(PROCESSO_ID);
    console.log(`Antes de gerar v1 — tabela compilada: ${antesV1.totalDocs} documento(s): ${antesV1.nomes.join(", ")}`);

    const resultadoV1 = await gerarLaudo(PROCESSO_ID);
    if ("error" in resultadoV1) throw new Error(`gerarLaudo (v1) falhou: ${resultadoV1.error}`);
    console.log(`Laudo v1 gerado (versão ${resultadoV1.versao}).`);

    const { data: laudoV1 } = await supabase
      .from("laudos_gerados")
      .select("id, storage_path_pdf")
      .eq("processo_id", PROCESSO_ID)
      .eq("versao", resultadoV1.versao)
      .single();
    laudoV1Id = laudoV1!.id;
    laudoV1Path = laudoV1!.storage_path_pdf;

    console.log(`\n>>> ANOTADO (passo 1 do roteiro): v1 tem ${antesV1.totalDocs} documentos na tabela: ${antesV1.nomes.join(" | ")}\n`);

    // ---- Passo 2: marca v1 como protocolado ----
    linha("=");
    console.log('PASSO 2 — "Marcar como protocolado"');
    linha("=");
    const protocolado = await marcarLaudoProtocolado(laudoV1Id, PROCESSO_ID, null);
    if ("error" in protocolado) throw new Error(`marcarLaudoProtocolado falhou: ${protocolado.error}`);
    console.log("Laudo v1 marcado como protocolado.\n");

    // Pré-requisito descoberto durante a preparação do teste: abrir ciclo de
    // pós-laudo também exige uma "conclusão vigente" confirmada (tela do
    // laudo final) — sem isso abrirCicloPosLaudo recusa. Não fazia parte do
    // roteiro original porque na tela isso já é natural (ela confirma antes
    // de seguir pro pós-laudo).
    const conclusao = await definirConclusaoVigenteInicial(
      PROCESSO_ID,
      "[teste anti-join] Conclusão de teste — sem nexo causal, sem incapacidade. Usada apenas para viabilizar a abertura do ciclo de pós-laudo nesta verificação.",
    );
    if (conclusao && "error" in conclusao) throw new Error(`definirConclusaoVigenteInicial falhou: ${conclusao.error}`);

    // ---- Passo 3: abre ciclo de pós-laudo e sobe documento superveniente ----
    linha("=");
    console.log("PASSO 3 — Abre ciclo de pós-laudo, sobe documento superveniente");
    linha("=");
    try {
      await abrirCicloPosLaudo(PROCESSO_ID);
    } catch (e) {
      if (!(e instanceof Error) || e.message !== "__SHIM_REDIRECT__") throw e; // esperado — ver shims/next-navigation.ts
    }
    const { data: ciclo } = await supabase
      .from("pos_laudo_ciclos")
      .select("id, numero_ciclo")
      .eq("processo_id", PROCESSO_ID)
      .order("numero_ciclo", { ascending: false })
      .limit(1)
      .single();
    console.log(`Ciclo ${ciclo!.numero_ciclo} aberto (${ciclo!.id}).`);

    const supervenienteForm = new FormData();
    supervenienteForm.set("arquivo", arquivoFake("Documento-Superveniente-Pos-Pericia.pdf"));
    supervenienteForm.set("papel", "superveniente");
    const superveniente = await adicionarDocumentoSuperveniente(ciclo!.id, PROCESSO_ID, supervenienteForm);
    if (superveniente && "error" in superveniente) throw new Error(`adicionarDocumentoSuperveniente falhou: ${superveniente.error}`);
    console.log("Documento superveniente enviado (tipo: superveniente).\n");

    // ---- Passo 4: gera o laudo de novo (v2) e compara ----
    linha("=");
    console.log("PASSO 4 — Gera o laudo novamente (v2) e compara com v1");
    linha("=");

    antesV2 = await extrairTabelaDocumentos(PROCESSO_ID);
    const resultadoV2 = await gerarLaudo(PROCESSO_ID);
    if ("error" in resultadoV2) throw new Error(`gerarLaudo (v2) falhou: ${resultadoV2.error}`);
    console.log(`Laudo v2 gerado (versão ${resultadoV2.versao}).`);

    console.log(`\n>>> RESULTADO (passo 5 do roteiro): v2 tem ${antesV2.totalDocs} documentos na tabela: ${antesV2.nomes.join(" | ")}`);

    linha("=");
    console.log("VEREDITO");
    linha("=");
    const mesmaContagem = antesV1.totalDocs === antesV2.totalDocs;
    const mesmosNomes = JSON.stringify(antesV1.nomes) === JSON.stringify(antesV2.nomes);
    const supervenienteAusente = !antesV2.nomes.some((n) => n.includes("Superveniente"));
    console.log(`Contagem igual (v1 vs v2): ${mesmaContagem ? "SIM" : "NÃO — " + antesV1.totalDocs + " vs " + antesV2.totalDocs}`);
    console.log(`Mesmos documentos, mesma ordem: ${mesmosNomes ? "SIM" : "NÃO"}`);
    console.log(`Superveniente ausente da tabela: ${supervenienteAusente ? "SIM" : "NÃO — VAZOU"}`);
    console.log(mesmaContagem && mesmosNomes && supervenienteAusente ? "\n✅ ANTI-JOIN OK." : "\n❌ ANTI-JOIN FALHOU.");

    const { data: laudoV2 } = await supabase
      .from("laudos_gerados")
      .select("id, storage_path_pdf")
      .eq("processo_id", PROCESSO_ID)
      .eq("versao", resultadoV2.versao)
      .single();
    laudoV2Path = laudoV2!.storage_path_pdf;

    console.log("\nBaixando PDFs v1 e v2 para inspeção local...");
    const fs = await import("node:fs");
    for (const [label, path] of [
      ["v1", laudoV1Path],
      ["v2", laudoV2Path],
    ] as const) {
      const { data: arq, error } = await supabase.storage.from("laudos-gerados").download(path!);
      if (error || !arq) {
        console.log(`  ${label}: erro ao baixar (${error?.message})`);
        continue;
      }
      const destino = `scripts/antijoin-check/${label}.pdf`;
      fs.writeFileSync(destino, Buffer.from(await arq.arrayBuffer()));
      console.log(`  ${label} salvo em ${destino}`);
    }
  } finally {
    linha("=");
    console.log("LIMPEZA");
    linha("=");
    const removidos = await limparTudo(supabase, secaoEncerramento!.id);
    console.log(
      `Removidos: ${removidos.ciclos} ciclo(s), ${removidos.laudos} laudo(s), ${removidos.documentos} documento(s), ${removidos.respostasSecao} resposta(s) de seção (stub).`,
    );
    console.log("Processo de teste restaurado ao estado original.");
  }
}

main().catch((e) => {
  console.error("\nERRO NO TESTE:", e);
  process.exit(1);
});
