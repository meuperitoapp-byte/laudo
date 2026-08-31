import * as fs from "node:fs";
import * as path from "node:path";
import PdfPrinter from "pdfmake/js/Printer";
import URLResolver from "pdfmake/js/URLResolver";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
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
 * Renderiza o MESMO ModeloLaudo usado por renderizar-docx.ts como PDF, via
 * pdfmake — ver justificativa da escolha de biblioteca (Etapa 4 do plano):
 * um modelo intermediário único consumido por dois renderizadores burros,
 * pra Word e PDF nunca divergirem em conteúdo.
 *
 * Usa `PdfPrinter` (API de servidor da lib, não `pdfMake.createPdf` de
 * browser) — exige fontes .ttf de verdade registradas por caminho de
 * arquivo. Reaproveita a fonte Roboto já embutida no pacote `pdfmake`
 * (cobertura boa de acentuação em português, sem precisar baixar/versionar
 * fonte própria agora).
 *
 * Nota pra quando o deploy sair do papel (Vercel serverless, hoje
 * deliberadamente adiado): resolver caminho de fonte via `require.resolve`
 * depende do arquivo .ttf estar presente no bundle da function — funciona
 * liso em servidor Node próprio, mas vale testar de novo nesse ambiente
 * quando chegar a hora.
 */

// Monta o caminho a partir de process.cwd() (raiz do projeto — verdadeiro em
// `next dev`/`next start`, os dois jeitos que este app roda hoje), em vez de
// require.resolve(...): tentar isso deu dois problemas diferentes —
// require.resolve(".../algo.ttf") direto faz o Turbopack tentar empacotar o
// .ttf como módulo (tipo desconhecido, build quebra); e mesmo resolvendo só
// o package.json (tipo que o bundler entende), o require.resolve do Next.js
// já processado devolve um id interno de módulo, não um caminho de arquivo
// de verdade (quebra em tempo de build também). process.cwd() + path.join
// não passa por resolução de módulo nenhuma — só concatena string.
const pastaFontesRoboto = path.join(process.cwd(), "node_modules", "pdfmake", "fonts", "Roboto");

const FONTES = {
  Roboto: {
    normal: path.join(pastaFontesRoboto, "Roboto-Regular.ttf"),
    bold: path.join(pastaFontesRoboto, "Roboto-Medium.ttf"),
    italics: path.join(pastaFontesRoboto, "Roboto-Italic.ttf"),
    bolditalics: path.join(pastaFontesRoboto, "Roboto-MediumItalic.ttf"),
  },
};

function tituloSecao(texto: string): Content {
  return { text: texto, style: "tituloSecao" };
}

function blocoParaPdf(bloco: BlocoConteudo): Content[] {
  if (bloco.tipo === "paragrafo") {
    return [{ text: bloco.texto, margin: [0, 0, 0, 10] }];
  }
  if (bloco.tipo === "assinatura") {
    return [
      { text: bloco.cidadeData, alignment: "right", margin: [0, 0, 0, 30] }, // espaço em branco antes do nome
      { text: bloco.nome, alignment: "center" },
      { text: bloco.tituloCrm, alignment: "center", margin: [0, 0, 0, 10] },
    ];
  }
  if (bloco.tipo === "tabela") {
    return [
      {
        table: {
          headerRows: 1,
          widths: bloco.colunas.map(() => "*"),
          body: [
            bloco.colunas.map((c) => ({ text: c, bold: true, fillColor: "#e5e5e5" })),
            ...bloco.linhas.map((linha) => linha.map((valor) => ({ text: valor }))),
          ],
        },
        margin: [0, 0, 0, 10],
      },
    ];
  }

  // bloco.tipo === "quesitos"
  return bloco.itens.flatMap((q): Content[] => {
    const cabecalhoQuesito = q.origem ? `${q.numero}. (${q.origem}) ${q.pergunta}` : `${q.numero}. ${q.pergunta}`;
    return [
      { text: cabecalhoQuesito, bold: true, margin: [0, 8, 0, 2] },
      { text: q.resposta?.trim() || "Sem resposta registrada.", margin: [0, 0, 0, 6] },
    ];
  });
}

function imagemBase64(imagem: AtivoImagem): string {
  return `data:${imagem.mimeType};base64,${imagem.bytes.toString("base64")}`;
}

/** Bloco "Documentos e Imagens da Perícia" — uma imagem por vez, centralizada, com o nome do arquivo como legenda. */
function blocoImagensPericia(imagens: ImagemPericiaEmbutida[]): Content[] {
  if (imagens.length === 0) return [];
  const conteudo: Content[] = [tituloSecao("DOCUMENTOS E IMAGENS DA PERÍCIA")];
  for (const imagem of imagens) {
    conteudo.push({ image: imagemBase64(imagem), width: 320, alignment: "center", margin: [0, 10, 0, 2] });
    conteudo.push({ text: imagem.nomeArquivo, alignment: "center", margin: [0, 0, 0, 10] });
  }
  return conteudo;
}

export async function renderizarPdf(
  modelo: ModeloLaudo,
  ativos: AtivosGlobais,
  imagensPericia: ImagemPericiaEmbutida[] = []
): Promise<Buffer> {
  const conteudo: Content[] = [];

  for (const linha of modelo.cabecalho.linhasEndereco) {
    conteudo.push({ text: linha });
  }
  // Espaço fixo (10 linhas) entre o endereçamento e os dados do processo.
  for (let i = 0; i < LINHAS_ENTRE_ENDERECO_E_PROCESSO; i++) {
    conteudo.push({ text: " " });
  }
  if (modelo.cabecalho.processoNumero) {
    conteudo.push({ text: `Processo nº: ${modelo.cabecalho.processoNumero}` });
  }
  if (modelo.cabecalho.parteAutora) {
    conteudo.push({ text: `Parte autora / Reclamante: ${modelo.cabecalho.parteAutora}` });
  }
  if (modelo.cabecalho.partesRe) {
    conteudo.push({ text: `Parte ré / Reclamada(s): ${modelo.cabecalho.partesRe}` });
  }

  // Título do documento, entre os dados do processo e a Apresentação, com
  // 3 linhas em branco de folga acima e abaixo.
  for (let i = 0; i < LINHAS_ENTORNO_TITULO_DOCUMENTO; i++) {
    conteudo.push({ text: " " });
  }
  conteudo.push({ text: TITULO_DOCUMENTO, bold: true, alignment: "center", fontSize: 16 });
  for (let i = 0; i < LINHAS_ENTORNO_TITULO_DOCUMENTO; i++) {
    conteudo.push({ text: " " });
  }

  conteudo.push(tituloSecao("APRESENTAÇÃO"));
  conteudo.push({ text: modelo.apresentacao, margin: [0, 0, 0, 10] });

  // Seções do tipo_laudo (já com o bloco de Quesitos na posição certa — ver compilar.ts).
  // Documentos e Imagens da Perícia entram logo antes do Encerramento — depois de todo
  // o conteúdo analítico, mas antes do parágrafo/assinatura final (que precisa continuar
  // sendo o último conteúdo do documento).
  for (const secao of modelo.secoes) {
    if (secao.codigo === "encerramento") {
      conteudo.push(...blocoImagensPericia(imagensPericia));
    }
    conteudo.push(tituloSecao(secao.titulo));
    conteudo.push(...secao.blocos.flatMap(blocoParaPdf));
  }

  // Assinatura — imagem, se já cadastrada (Etapa 5); senão, espaço em branco pra assinatura manual.
  if (ativos.assinatura) {
    conteudo.push({
      image: imagemBase64(ativos.assinatura),
      width: 150,
      alignment: "center",
      margin: [0, 30, 0, 0],
    });
  } else {
    conteudo.push({
      text: "_______________________________________________",
      alignment: "center",
      margin: [0, 40, 0, 0],
    });
    conteudo.push({ text: "Assinatura da Perita", alignment: "center", italics: true });
  }

  // Faixa de identidade no RODAPÉ de toda página — régua fina + logo pequena +
  // linha de contato. Decoração de página (não toca no corpo; o endereçamento
  // formal segue como 1ª coisa visível na pág. 1). Sem logo nem contato, a
  // faixa não é desenhada.
  const temFaixa = Boolean(ativos.logomarca || modelo.rodapeTexto);
  const rodapeIdentidade = temFaixa
    ? (): Content => {
        const itens: Content[] = [
          { canvas: [{ type: "line", x1: 0, y1: 0, x2: 483, y2: 0, lineWidth: 0.5, lineColor: "#999999" }] },
        ];
        if (ativos.logomarca) {
          itens.push({ image: imagemBase64(ativos.logomarca), width: 55, alignment: "center", margin: [0, 4, 0, 0] });
        }
        if (modelo.rodapeTexto) {
          itens.push({
            text: modelo.rodapeTexto,
            alignment: "center",
            fontSize: 7.5,
            color: "#555555",
            margin: [0, 3, 0, 0],
          });
        }
        return { margin: [56, 6, 56, 0], stack: itens };
      }
    : undefined;

  const docDefinition: TDocumentDefinitions = {
    defaultStyle: { font: "Roboto", fontSize: 11, alignment: "justify" },
    pageMargins: [56, 56, 56, temFaixa ? 78 : 56],
    footer: rodapeIdentidade,
    content: conteudo,
    styles: {
      tituloSecao: { fontSize: 13, bold: true, margin: [0, 16, 0, 8] },
    },
  };

  // urlResolver é exigido pelo construtor mesmo só usando fontes locais —
  // ver nota em pdfmake-printer.d.ts.
  const printer = new PdfPrinter(FONTES, undefined, new URLResolver(fs));
  const pdfDoc = await printer.createPdfKitDocument(docDefinition);

  const chunks: Buffer[] = [];
  const finalizado = new Promise<Buffer>((resolve) => {
    pdfDoc.on("data", (chunk) => chunks.push(chunk));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
  });
  pdfDoc.end();

  return finalizado;
}
