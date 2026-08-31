import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { BlocoConteudo, ModeloLaudo } from "./modelo";
import type { AtivoImagem, AtivosGlobais } from "./ativos-globais";
import type { ImagemPericiaEmbutida } from "./imagens-pericia";

/** Nº de linhas em branco entre o endereçamento ao Juízo e os dados do processo (pedido da cliente, só no documento final). */
const LINHAS_ENTRE_ENDERECO_E_PROCESSO = 10;
/** Título do documento entre os dados do processo e a Apresentação (pedido da cliente). */
const TITULO_DOCUMENTO = "LAUDO PERICIAL";
/** Linhas em branco antes e depois do título "LAUDO PERICIAL" (pedido da cliente). */
const LINHAS_ENTORNO_TITULO_DOCUMENTO = 3;

/**
 * Renderiza o modelo compilado (mesma fonte usada pelo PDF — ver modelo.ts)
 * como um .docx de verdade, usando a lib `docx`. Nenhuma formatação aqui
 * decide o CONTEÚDO — só como os mesmos blocos aparecem na página; qualquer
 * ajuste de conteúdo é em compilar.ts/cabecalho.ts/apresentacao.ts, nunca
 * duplicado aqui.
 */

const FONTE = "Times New Roman";
const TAMANHO_BASE = 24; // "half-points" do docx: 24 = 12pt
const TAMANHO_TITULO = 28; // 14pt
const TAMANHO_TABELA = 20; // 10pt

type Bloco = Paragraph | Table;

function paragrafo(
  texto: string,
  opts: { negrito?: boolean; centralizado?: boolean; direita?: boolean } = {}
): Paragraph {
  const alinhamento = opts.centralizado
    ? AlignmentType.CENTER
    : opts.direita
      ? AlignmentType.RIGHT
      : AlignmentType.JUSTIFIED;
  return new Paragraph({
    alignment: alinhamento,
    spacing: { after: 200 },
    children: [new TextRun({ text: texto, bold: opts.negrito, font: FONTE, size: TAMANHO_BASE })],
  });
}

function tituloSecao(texto: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text: texto, bold: true, font: FONTE, size: TAMANHO_TITULO })],
  });
}

/** Título do documento — "LAUDO PERICIAL", centralizado, maior que os títulos de seção. */
function tituloDocumento(texto: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 360 },
    children: [new TextRun({ text: texto, bold: true, font: FONTE, size: 32 })], // 16pt
  });
}

function celula(texto: string, opts: { negrito?: boolean; fundo?: string } = {}): TableCell {
  return new TableCell({
    shading: opts.fundo ? { fill: opts.fundo } : undefined,
    children: [
      new Paragraph({
        children: [new TextRun({ text: texto, bold: opts.negrito, font: FONTE, size: TAMANHO_TABELA })],
      }),
    ],
  });
}

function tabelaDocx(colunas: string[], linhas: string[][]): Table {
  const linhaCabecalho = new TableRow({
    tableHeader: true,
    children: colunas.map((c) => celula(c, { negrito: true, fundo: "E5E5E5" })),
  });
  const linhasDados = linhas.map((linha) => new TableRow({ children: linha.map((valor) => celula(valor)) }));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [linhaCabecalho, ...linhasDados],
  });
}

function blocoParaDocx(bloco: BlocoConteudo): Bloco[] {
  if (bloco.tipo === "paragrafo") return [paragrafo(bloco.texto)];
  if (bloco.tipo === "tabela") return [tabelaDocx(bloco.colunas, bloco.linhas)];

  if (bloco.tipo === "assinatura") {
    return [
      paragrafo(bloco.cidadeData, { direita: true }),
      new Paragraph({ spacing: { after: 400 }, children: [] }), // espaço em branco
      paragrafo(bloco.nome, { centralizado: true }),
      paragrafo(bloco.tituloCrm, { centralizado: true }),
    ];
  }

  // bloco.tipo === "quesitos"
  return bloco.itens.flatMap((q) => {
    const cabecalhoQuesito = q.origem ? `${q.numero}. (${q.origem}) ${q.pergunta}` : `${q.numero}. ${q.pergunta}`;
    return [paragrafo(cabecalhoQuesito, { negrito: true }), paragrafo(q.resposta?.trim() || "Sem resposta registrada.")];
  });
}

/** Tipo aceito pelo ImageRun do docx, a partir do mime_type salvo em `documentos`. */
function tipoImagemDocx(mimeType: string): "png" | "jpg" | "gif" | "bmp" {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("gif")) return "gif";
  if (mimeType.includes("bmp")) return "bmp";
  return "jpg"; // jpeg é o caso mais comum fora png
}

/** Redimensiona pra uma largura alvo (px) preservando a proporção original. */
function dimensionar(imagem: AtivoImagem, larguraAlvo: number): { width: number; height: number } {
  const proporcao = imagem.alturaPx / imagem.larguraPx;
  return { width: larguraAlvo, height: Math.round(larguraAlvo * proporcao) };
}

function imagemDocx(imagem: AtivoImagem, larguraAlvo: number): ImageRun {
  return new ImageRun({
    type: tipoImagemDocx(imagem.mimeType),
    data: imagem.bytes,
    transformation: dimensionar(imagem, larguraAlvo),
  });
}

/** Bloco "Documentos e Imagens da Perícia" — uma imagem por vez, centralizada, com o nome do arquivo como legenda. */
function blocoImagensPericia(imagens: ImagemPericiaEmbutida[]): Bloco[] {
  if (imagens.length === 0) return [];
  const filhos: Bloco[] = [tituloSecao("DOCUMENTOS E IMAGENS DA PERÍCIA")];
  for (const imagem of imagens) {
    filhos.push(
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [imagemDocx(imagem, 380)] })
    );
    filhos.push(paragrafo(imagem.nomeArquivo, { centralizado: true }));
  }
  return filhos;
}

export async function renderizarDocx(
  modelo: ModeloLaudo,
  ativos: AtivosGlobais,
  imagensPericia: ImagemPericiaEmbutida[] = []
): Promise<Buffer> {
  const filhos: Bloco[] = [];

  // Cabeçalho formal
  for (const linha of modelo.cabecalho.linhasEndereco) {
    filhos.push(paragrafo(linha));
  }
  // Espaço fixo (10 linhas) entre o endereçamento e os dados do processo.
  for (let i = 0; i < LINHAS_ENTRE_ENDERECO_E_PROCESSO; i++) {
    filhos.push(new Paragraph({ children: [] }));
  }
  if (modelo.cabecalho.processoNumero) {
    filhos.push(paragrafo(`Processo nº: ${modelo.cabecalho.processoNumero}`));
  }
  if (modelo.cabecalho.parteAutora) {
    filhos.push(paragrafo(`Parte autora / Reclamante: ${modelo.cabecalho.parteAutora}`));
  }
  if (modelo.cabecalho.partesRe) {
    filhos.push(paragrafo(`Parte ré / Reclamada(s): ${modelo.cabecalho.partesRe}`));
  }

  // Título do documento, entre os dados do processo e a Apresentação, com
  // 3 linhas em branco de folga acima e abaixo.
  for (let i = 0; i < LINHAS_ENTORNO_TITULO_DOCUMENTO; i++) {
    filhos.push(new Paragraph({ children: [] }));
  }
  filhos.push(tituloDocumento(TITULO_DOCUMENTO));
  for (let i = 0; i < LINHAS_ENTORNO_TITULO_DOCUMENTO; i++) {
    filhos.push(new Paragraph({ children: [] }));
  }

  // Apresentação
  filhos.push(tituloSecao("APRESENTAÇÃO"));
  filhos.push(paragrafo(modelo.apresentacao));

  // Seções do tipo_laudo (já com o bloco de Quesitos na posição certa — ver compilar.ts).
  // Documentos e Imagens da Perícia entram logo antes do Encerramento — depois de todo
  // o conteúdo analítico, mas antes do parágrafo/assinatura final (que precisa continuar
  // sendo o último conteúdo do documento).
  for (const secao of modelo.secoes) {
    if (secao.codigo === "encerramento") {
      filhos.push(...blocoImagensPericia(imagensPericia));
    }
    filhos.push(tituloSecao(secao.titulo));
    filhos.push(...secao.blocos.flatMap(blocoParaDocx));
  }

  // Assinatura — imagem, se já cadastrada (Etapa 5); senão, espaço em branco pra assinatura manual.
  if (ativos.assinatura) {
    filhos.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
    filhos.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [imagemDocx(ativos.assinatura, 200)],
      })
    );
  } else {
    filhos.push(
      new Paragraph({
        spacing: { before: 600 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "_______________________________________________", font: FONTE, size: TAMANHO_BASE })],
      })
    );
    filhos.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Assinatura da Perita", font: FONTE, size: TAMANHO_BASE, italics: true })],
      })
    );
  }

  // Faixa de identidade no RODAPÉ de toda página — régua fina + logo pequena +
  // linha de contato. Decoração de página: não empurra nem substitui o corpo,
  // então o endereçamento formal continua sendo a 1ª coisa visível na pág. 1.
  // Some por inteiro se não houver nem logo nem contato configurados.
  const filhosRodape: Paragraph[] = [
    new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 4, space: 6, color: "999999" } },
      spacing: { after: 0 },
      children: [],
    }),
  ];
  if (ativos.logomarca) {
    filhosRodape.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 20, after: 0 },
        children: [imagemDocx(ativos.logomarca, 34)],
      })
    );
  }
  if (modelo.rodapeTexto) {
    filhosRodape.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: modelo.rodapeTexto, font: FONTE, size: 15, color: "555555" })], // ~7.5pt
      })
    );
  }
  const temFaixa = Boolean(ativos.logomarca || modelo.rodapeTexto);

  const documento = new Document({
    sections: [
      {
        properties: {},
        footers: temFaixa ? { default: new Footer({ children: filhosRodape }) } : undefined,
        children: filhos,
      },
    ],
  });

  return Packer.toBuffer(documento);
}
