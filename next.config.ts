import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fixa a raiz do projeto explicitamente: há um package-lock.json em
  // C:\Users\Jeferson (fora deste projeto) que o Turbopack detectava e usava
  // para inferir (erroneamente) a raiz do workspace.
  turbopack: {
    root: path.join(__dirname),
  },
  // src/features/geracao-laudo/renderizar-pdf.ts carrega as fontes .ttf do
  // pdfmake por caminho de arquivo montado em runtime (process.cwd() +
  // path.join), de propósito — não usa require.resolve porque isso quebrava
  // o build (ver comentário no próprio arquivo). Só que, por não ser um
  // require/import de verdade, o rastreamento de arquivos do Vercel
  // (@vercel/nft) não descobre sozinho que a function da rota do laudo
  // precisa desses .ttf — sem isto aqui, o PDF provavelmente falha em
  // produção (serverless) com "arquivo não encontrado", mesmo funcionando
  // liso local (`next dev`/`next start`, onde node_modules já está inteiro
  // no disco). Força a inclusão explicitamente.
  outputFileTracingIncludes: {
    "/processos/[id]/laudo": ["./node_modules/pdfmake/fonts/Roboto/*.ttf"],
  },
  // Toda tela de upload (Documentos, anexo do Chat) envia o arquivo direto
  // dentro do corpo de uma Server Action — o Next.js limita isso a 1MB por
  // padrão, bem abaixo dos limites de 25/50MB que o sistema já anuncia pro
  // usuário. Bug real (30/09/2026, relato dela): PDF de orçamento com
  // fotos/arte passava de 1MB e o envio quebrava antes de chegar no Supabase,
  // com uma tela de erro genérica do navegador. 50mb cobre o maior limite já
  // configurado (Documentos, ver TAMANHO_MAXIMO_BYTES).
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
