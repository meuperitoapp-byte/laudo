/**
 * Marca abstrata do sistema — sem letra/tipografia embutida (evita depender
 * de fonte específica em tamanho pequeno). Dois planos sobrepostos sugerem
 * "documento + assinatura conferida" sem ilustrar nenhum dos dois
 * literalmente. Cor fixa (não segue `dark:`) porque só aparece sobre o fundo
 * escuro da barra superior, nos dois temas.
 */
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
      <rect width="28" height="28" rx="8" fill="#0e9c95" />
      <path d="M8 14.5 L12.2 18.7 L20 9.5" stroke="#f5f3f0" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
