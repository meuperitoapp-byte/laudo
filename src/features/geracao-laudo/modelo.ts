import type { CabecalhoFormal } from "./cabecalho";
import type { SnapshotRespostas } from "@/types/json-fields";
import type { TipoTrabalhoProcesso } from "@/types/enums";

/**
 * Modelo intermediário do laudo compilado — a "fonte única" que os
 * renderizadores de Word (Etapa 3) e PDF (Etapa 4) vão consumir, cada um do
 * seu jeito, mas sempre a partir dos MESMOS blocos. É isso que garante que os
 * dois formatos nunca divirjam entre si (ver justificativa da escolha de
 * biblioteca — pdfmake em vez de Puppeteer/HTML, exatamente por causa disso).
 *
 * Assinatura/logomarca (Etapa 5) não entram como bloco — são imagens
 * binárias, fora do lugar num modelo que a tela de debug também serializa
 * como JSON. Ficam num objeto à parte (AtivosGlobais, ver ativos-globais.ts)
 * que os renderizadores recebem por fora, junto com o modelo.
 */

/** Um parágrafo de texto corrido — o texto_narrativo já resolvido de uma seção. */
export interface BlocoParagrafo {
  tipo: "paragrafo";
  texto: string;
}

/** Uma tabela com só as linhas efetivamente preenchidas (Regra de exibição crítica). */
export interface BlocoTabela {
  tipo: "tabela";
  colunas: string[];
  linhas: string[][];
}

export interface QuesitoCompilado {
  numero: number;
  origem: string | null;
  pergunta: string;
  resposta: string | null;
}

/**
 * Bloco de "Respostas aos Quesitos" — injetado na posição da seção
 * estrutural correspondente (codigo 'respostas_quesitos', mesmo convenção
 * nos 3 tipos de laudo mapeados), não mais anexado sempre no fim do
 * documento. CLAUDE.md > "Estrutura comum identificada" lista Quesitos (26)
 * antes de Conclusão (27) e Encerramento (28) — anexar sempre por último
 * jogava Quesitos depois do Encerramento, separando o parágrafo de
 * encerramento da assinatura que vem logo em seguida (Etapa 5).
 */
export interface BlocoQuesitos {
  tipo: "quesitos";
  itens: QuesitoCompilado[];
}

/**
 * Bloco de fechamento/assinatura — injetado na seção 'encerramento' (mesmo
 * codigo em todos os tipos de laudo), separado do parágrafo comum porque tem
 * alinhamento próprio no documento final (CLAUDE.md/pedido da Dra. Fernanda):
 * cidade/data alinhada à direita, depois nome e título centralizados. O
 * parágrafo de ressalva jurídica (texto_automatico_template da seção)
 * continua sendo um BlocoParagrafo normal, logo antes deste.
 */
export interface BlocoAssinatura {
  tipo: "assinatura";
  cidadeData: string;
  nome: string;
  tituloCrm: string;
}

export type BlocoConteudo = BlocoParagrafo | BlocoTabela | BlocoQuesitos | BlocoAssinatura;

/** Uma seção do tipo_laudo já compilada — só entra no modelo se tiver algum bloco (ver compilar.ts). */
export interface SecaoCompilada {
  secaoId: string;
  codigo: string;
  titulo: string;
  ordem: number;
  blocos: BlocoConteudo[];
}

/** Imagem da perícia (documentos.tipo = 'imagem_pericia') — referência pra Etapa 5 embutir de verdade. */
export interface ImagemPericiaRef {
  documentoId: string;
  nomeArquivo: string;
  storagePath: string;
}

export interface ModeloLaudo {
  processoId: string;
  /** 'pericia_judicial' | 'assistencia_tecnica' — escolhe o rodapé de contato no documento final (ver contatos.ts). */
  tipoTrabalho: TipoTrabalhoProcesso;
  tipoLaudoCodigo: string;
  tipoLaudoNome: string;
  geradoEm: string; // ISO 8601
  cabecalho: CabecalhoFormal;
  /** Parágrafo de Apresentação (identificação do perito + metodologia) — ver cabecalho.ts, ainda placeholder até a redação oficial ser definida. */
  apresentacao: string;
  /** Já inclui o bloco de Quesitos, na posição certa — ver BlocoQuesitos acima. */
  secoes: SecaoCompilada[];
  imagensPericia: ImagemPericiaRef[];
}

/**
 * Uma seção que tem conteúdo (campos respondidos e/ou tabela preenchida) mas
 * nunca foi salva explicitamente pela perita (nenhuma linha em
 * respostas_secao) — o texto narrativo, automático ou não, nunca passou
 * pelos olhos dela. CLAUDE.md: "texto sempre editável... revisa antes de
 * finalizar" pressupõe que ela VIU o texto, não só que ele existe
 * tecnicamente. compilarLaudo trata isso como bloqueio, não como aviso —
 * ver justificativa em compilar.ts.
 */
export interface PendenciaSecao {
  secaoId: string;
  titulo: string;
}

export type ResultadoCompilacao =
  | { status: "ok"; modelo: ModeloLaudo; snapshot: SnapshotRespostas }
  | { status: "erro"; mensagem: string }
  | { status: "pendente_revisao"; secoesPendentes: PendenciaSecao[] };
