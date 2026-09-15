// Shim de teste — no-op. `abrirCicloPosLaudo` chama redirect() só depois de já
// ter gravado no banco; fora do runtime do Next não há pra onde redirecionar,
// então só evita o import quebrar (o redirect real lança um erro especial
// interceptado pelo Next — aqui isso não é desejável nem necessário).
export function redirect(url: string): never {
  void url;
  throw new Error("__SHIM_REDIRECT__");
}
