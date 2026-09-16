/**
 * Estado de página inteira pra quando a consulta do registro PRINCIPAL falha
 * de verdade (não é "não encontrado" — é erro de leitura). Nunca deixar isso
 * cair no mesmo caminho de um 404: pra quem usa o sistema, "não encontrado"
 * significa "isso foi apagado/nunca existiu", enquanto uma falha de consulta
 * é passageira e não diz nada sobre o registro em si. Ver auditoria de
 * 21/09/2026 (dashboard mostrando "0 processos" por erro engolido em
 * silêncio) — mesmo cuidado espalhado pras telas que dependem de um
 * registro único pra existir.
 */
export function ErroConsultaPagina({ titulo = "Não foi possível carregar esta página" }: { titulo?: string }) {
  return (
    <main className="p-8 max-w-2xl mx-auto">
      <div className="rounded-xl border border-vinho-400/60 dark:border-vinho-600/40 bg-vinho-100 dark:bg-vinho-950/30 px-6 py-10 text-center space-y-3">
        <h1 className="font-title text-lg font-semibold text-vinho-700 dark:text-vinho-300">{titulo}</h1>
        <p className="text-sm text-vinho-700 dark:text-vinho-300">
          Houve uma falha ao buscar os dados agora — isso não significa que o registro foi perdido. Tente
          recarregar a página; se continuar acontecendo, avise o suporte.
        </p>
      </div>
    </main>
  );
}

/** Banner leve pra falha numa consulta SECUNDÁRIA (lista/detalhe complementar) — o resto da página segue de pé. */
export function BannerErroConsulta({ mensagem = "Algumas informações desta página não carregaram agora." }: { mensagem?: string }) {
  return (
    <div className="rounded-xl border border-vinho-400/60 dark:border-vinho-600/40 bg-vinho-100 dark:bg-vinho-950/30 px-4 py-3 text-sm text-vinho-700 dark:text-vinho-300">
      {mensagem}
    </div>
  );
}
