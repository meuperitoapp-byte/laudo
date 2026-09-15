// Shim de teste — no-op. As actions reais chamam revalidatePath ao final de
// cada operação (invalida cache de rota do Next); fora do runtime do Next
// isso não tem efeito nenhum, então só evita o import quebrar.
export function revalidatePath(path: string): void {
  void path;
}
