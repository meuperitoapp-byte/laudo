/**
 * Leitor mínimo de largura/altura de PNG e JPEG, direto dos bytes do
 * cabeçalho — só o suficiente pra escalar a imagem proporcionalmente ao
 * embutir no docx/PDF (assinatura da perita, logomarca da cliente). Escrito
 * à mão em vez de usar uma lib pronta (ex.: `image-size`) de propósito: a
 * única testada tinha vulnerabilidade conhecida (DoS por loop infinito) nos
 * parsers de formatos que nem usamos aqui (ICNS/JXL/HEIF) — como só
 * precisamos de PNG/JPEG, um parser pequeno e auditável evita carregar essa
 * superfície de risco à toa. Os laços abaixo têm limite de iterações e
 * checagem de tamanho de segmento, pra não repetir o mesmo tipo de bug.
 */
export interface DimensoesImagem {
  larguraPx: number;
  alturaPx: number;
}

export function lerDimensoesImagem(bytes: Buffer, mimeType: string): DimensoesImagem | null {
  if (mimeType.includes("png")) return lerDimensoesPng(bytes);
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return lerDimensoesJpeg(bytes);
  return null;
}

const ASSINATURA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function lerDimensoesPng(bytes: Buffer): DimensoesImagem | null {
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(ASSINATURA_PNG)) return null;
  // IHDR: 8 bytes de assinatura + 4 (tamanho do chunk) + 4 ("IHDR") + 4 (largura) + 4 (altura), big-endian.
  return { larguraPx: bytes.readUInt32BE(16), alturaPx: bytes.readUInt32BE(20) };
}

function lerDimensoesJpeg(bytes: Buffer): DimensoesImagem | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;
  const MAX_ITERACOES = 10_000; // limite defensivo — um JPEG válido nunca chega perto disso
  for (let i = 0; i < MAX_ITERACOES && offset + 4 <= bytes.length; i++) {
    if (bytes[offset] !== 0xff) {
      offset += 1; // ressincroniza, avança sempre pelo menos 1 byte
      continue;
    }
    const marcador = bytes[offset + 1];
    // SOI/RST/marcadores sem segmento de tamanho — pula só os 2 bytes do marcador.
    if (marcador === 0xd8 || marcador === 0x01 || (marcador >= 0xd0 && marcador <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (marcador === 0xd9) break; // EOI — fim da imagem, nenhum SOF encontrado

    const tamanho = bytes.readUInt16BE(offset + 2);
    if (tamanho < 2) break; // segmento malformado — desiste com segurança em vez de girar em falso

    const ehSof = marcador >= 0xc0 && marcador <= 0xcf && marcador !== 0xc4 && marcador !== 0xc8 && marcador !== 0xcc;
    if (ehSof) {
      if (offset + 9 > bytes.length) return null;
      return { alturaPx: bytes.readUInt16BE(offset + 5), larguraPx: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + tamanho;
  }
  return null;
}
