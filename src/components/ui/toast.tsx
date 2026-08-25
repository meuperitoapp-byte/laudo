"use client";

import { useEffect } from "react";

/**
 * Banner de confirmação flutuante (salvar seção, etc.) — puramente de
 * apresentação. Quem decide QUANDO mostrar/esconder é sempre o caller (guarda
 * a mensagem no próprio estado); este componente só cuida do visual e do
 * auto-dismiss pro caso de sucesso.
 */
export function Toast({
  tipo,
  texto,
  onClose,
}: {
  tipo: "ok" | "erro";
  texto: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (tipo !== "ok") return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [tipo, texto, onClose]);

  const estilo =
    tipo === "ok"
      ? "border-musgo-600/30 bg-musgo-100 text-musgo-600 dark:border-musgo-400/30 dark:bg-musgo-950 dark:text-musgo-400"
      : "border-vinho-600/30 bg-vinho-100 text-vinho-600 dark:border-vinho-400/30 dark:bg-vinho-950 dark:text-vinho-400";

  return (
    <div
      role="status"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg motion-safe:animate-[toast-in_0.18s_ease-out] ${estilo}`}
    >
      <span aria-hidden="true" className="text-base leading-none">
        {tipo === "ok" ? "✓" : "!"}
      </span>
      <span>{texto}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar aviso"
        className="ml-1 text-current opacity-60 hover:opacity-100"
      >
        ✕
      </button>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
