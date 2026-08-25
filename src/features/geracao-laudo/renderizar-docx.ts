import {
  AlignmentType,
  Document,
  Header,
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

function paragrafo(texto: string, opts: { negrito?: boolean; centralizado?: boolean } = {}): Paragraph {
  return new Paragraph({
    alignment: opts.centralizado ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
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

export async function renderizarDocx(modelo: ModeloLaudo, ativos: AtivosGlobais): Promise<Buffer> {
  const filhos: Bloco[] = [];

  // Cabeçalho formal
  for (const linha of modelo.cabecalho.linhasEndereco) {
    filhos.push(paragrafo(linha));
  }
  filhos.push(paragrafo(""));
  if (modelo.cabecalho.processoNumero) {
    filhos.push(paragrafo(`Processo nº: ${modelo.cabecalho.processoNumero}`));
  }
  if (modelo.cabecalho.parteAutora) {
    filhos.push(paragrafo(`Parte autora / Reclamante: ${modelo.cabecalho.parteAutora}`));
  }
  if (modelo.cabecalho.partesRe) {
    filhos.push(paragrafo(`Parte ré / Reclamada(s): ${modelo.cabecalho.partesRe}`));
  }

  // Apresentação
  filhos.push(tituloSecao("APRESENTAÇÃO"));
  filhos.push(paragrafo(modelo.apresentacao));

  // Seções do tipo_laudo (já com o bloco de Quesitos na posição certa — ver compilar.ts)
  for (const secao of modelo.secoes) {
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
        children: [new TextRun({ text: "Assinatura do(a) Perito(a)", font: FONTE, size: TAMANHO_BASE, italics: true })],
      })
    );
  }

  const documento = new Document({
    sections: [
      {
        properties: {},
        // Logomarca da cliente, se já cadastrada — repete no topo de toda página.
        headers: ativos.logomarca
          ? {
              default: new Header({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [imagemDocx(ativos.logomarca, 150)],
                  }),
                ],
              }),
            }
          : undefined,
        children: filhos,
      },
    ],
  });

  return Packer.toBuffer(documento);
}
