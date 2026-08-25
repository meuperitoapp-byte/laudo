/**
 * `pdfmake` só publica tipos pro uso de browser (`pdfMake.createPdf`, ver
 * @types/pdfmake). O uso de servidor de verdade é `PdfPrinter`, em
 * `pdfmake/js/Printer` — sem tipos oficiais. Declaração mínima, só com o que
 * de fato usamos em renderizar-pdf.ts.
 */
declare module "pdfmake/js/Printer" {
  import type { TDocumentDefinitions } from "pdfmake/interfaces";

  export interface FontDescriptor {
    normal: string;
    bold?: string;
    italics?: string;
    bolditalics?: string;
  }

  /** O que a lib de fato devolve é um documento pdfkit — só tipamos o que usamos pra virar Buffer. */
  export interface PdfKitDocumentLike {
    on(event: "data", listener: (chunk: Buffer) => void): this;
    on(event: "end", listener: () => void): this;
    end(): void;
  }

  export default class PdfPrinter {
    /**
     * `urlResolver` é obrigatório nesta versão mesmo só usando fontes locais
     * (arquivo .ttf por caminho) — ele só faz algo de verdade pra URLs
     * http(s)://, mas o construtor acessa `.resolve()` sempre. Ver
     * `pdfmake/js/URLResolver`, instanciado em renderizar-pdf.ts.
     */
    constructor(
      fonts: Record<string, FontDescriptor>,
      virtualFs?: unknown,
      urlResolver?: { resolve(url: string, headers?: Record<string, string>): Promise<void>; resolved(): Promise<unknown> },
      localAccessPolicy?: (path: string) => boolean
    );
    createPdfKitDocument(
      docDefinition: TDocumentDefinitions,
      options?: Record<string, unknown>
    ): Promise<PdfKitDocumentLike>;
  }
}

declare module "pdfmake/js/URLResolver" {
  export default class URLResolver {
    constructor(fs: typeof import("node:fs"));
    setUrlAccessPolicy(callback: (url: string) => boolean): void;
    resolve(url: string, headers?: Record<string, string>): Promise<void>;
    resolved(): Promise<unknown>;
  }
}
