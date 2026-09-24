/**
 * <select> de responsável reutilizado em todo campo "Responsável" do sistema
 * (Reunião — Estratégia Pericial, Análise da Contestação, Estratégia
 * Pericial) — pedido da Dra. Fernanda 24/09/2026: nomes dos logins criados,
 * não texto livre. `nomes` vem de listarNomesResponsaveis() (Server Component
 * pai) — este componente em si não busca dado, só renderiza.
 */
export function SelectResponsavel({
  id,
  name,
  defaultValue,
  nomes,
  className,
}: {
  id?: string;
  name: string;
  defaultValue?: string | null;
  nomes: string[];
  className: string;
}) {
  return (
    <select id={id} name={name} defaultValue={defaultValue ?? ""} className={className}>
      <option value="">Selecione…</option>
      {nomes.map((nome) => (
        <option key={nome} value={nome}>
          {nome}
        </option>
      ))}
    </select>
  );
}
