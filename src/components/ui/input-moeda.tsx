"use client";

import { useState } from "react";

/** Centavos (inteiro) → "1.234,56". Vazio quando não há valor. */
function formatarCentavos(centavos: number | null): string {
  if (centavos === null) return "";
  return (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "1234.56" | 1234.56 | "" → centavos. */
function paraCentavos(valor: string | number | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/**
 * Campo de valor em reais com máscara de digitação (cada dígito entra pela
 * direita: 123456 → 1.234,56), no lugar de `type="number"` que só andava
 * pelas setas (lote 23/10/2026, relato dela). O valor que sai é sempre o
 * número puro em string ("1234.56", "" quando vazio) — via `onChange` no uso
 * controlado, ou via input oculto `name` dentro de um <form>.
 */
export function InputMoeda({
  id,
  name,
  value,
  defaultValue,
  onChange,
  required,
  className,
}: {
  id?: string;
  /** Dentro de <form action>: nome do input oculto que leva "1234.56". */
  name?: string;
  /** Uso controlado (string "1234.56" ou ""). */
  value?: string;
  defaultValue?: string | number | null;
  onChange?: (valor: string) => void;
  required?: boolean;
  className?: string;
}) {
  const [interno, setInterno] = useState<number | null>(paraCentavos(defaultValue));
  const controlado = value !== undefined;
  const centavos = controlado ? paraCentavos(value) : interno;

  function alterar(texto: string) {
    const digitos = texto.replace(/\D/g, "").slice(0, 12);
    const novo = digitos ? Number(digitos) : null;
    setInterno(novo);
    onChange?.(novo === null ? "" : (novo / 100).toFixed(2));
  }

  return (
    <>
      {name && <input type="hidden" name={name} value={centavos === null ? "" : (centavos / 100).toFixed(2)} />}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        required={required}
        value={formatarCentavos(centavos)}
        onChange={(e) => alterar(e.target.value)}
        placeholder="0,00"
        className={className}
      />
    </>
  );
}
