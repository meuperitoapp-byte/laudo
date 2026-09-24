"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarPerfil, renomearPerfil, excluirPerfil, salvarPermissoesPerfil, convidarUsuario, desvincularUsuario } from "./actions";
import { MODULO_ROTULOS, MODULOS_ORDENADOS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import type { ModuloSistema } from "@/types/enums";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";
const cardClass = "rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4";

interface Perfil {
  id: string;
  nome: string;
}
interface UsuarioVinculado {
  id: string;
  perfilId: string;
  email: string;
  nomeExibicao: string;
}

function useAcao() {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function executar<T extends { success: true }>(
    fn: () => Promise<{ error: string } | T>,
    sucesso: string | ((resultado: T) => string) = "Salvo.",
  ) {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await fn();
      if ("error" in resultado) {
        setMensagem({ tipo: "erro", texto: resultado.error });
        return;
      }
      const texto = typeof sucesso === "function" ? sucesso(resultado) : sucesso;
      setMensagem({ tipo: "ok", texto });
      router.refresh();
    });
  }

  return { mensagem, setMensagem, isPending, executar };
}

function PerfilCard({ perfil, modulosPermitidos }: { perfil: Perfil; modulosPermitidos: ModuloSistema[] }) {
  const { mensagem, setMensagem, isPending, executar } = useAcao();
  const [nome, setNome] = useState(perfil.nome);
  const [selecionados, setSelecionados] = useState<Set<ModuloSistema>>(new Set(modulosPermitidos));

  function alternarModulo(m: ModuloSistema) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(m)) novo.delete(m);
      else novo.add(m);
      return novo;
    });
  }

  function salvarPermissoes() {
    const fd = new FormData();
    fd.set("perfil_id", perfil.id);
    selecionados.forEach((m) => fd.append("modulo", m));
    executar(() => salvarPermissoesPerfil(fd));
  }

  function salvarNome() {
    if (!nome.trim() || nome.trim() === perfil.nome) return;
    const fd = new FormData();
    fd.set("perfil_id", perfil.id);
    fd.set("nome", nome.trim());
    executar(() => renomearPerfil(fd), "Nome atualizado.");
  }

  function excluir() {
    if (!window.confirm(`Excluir o perfil "${perfil.nome}"? Só funciona se ninguém estiver vinculado a ele.`)) return;
    const fd = new FormData();
    fd.set("perfil_id", perfil.id);
    executar(() => excluirPerfil(fd), "Perfil excluído.");
  }

  return (
    <div className={cardClass}>
      <div className="flex items-center gap-2">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onBlur={salvarNome}
          className="flex-1 rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-1.5 text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500"
        />
        <button
          type="button"
          onClick={excluir}
          disabled={isPending}
          className="text-sm text-vinho-600 hover:underline dark:text-vinho-400 disabled:opacity-40 shrink-0"
        >
          Excluir
        </button>
      </div>

      <div>
        <p className={labelClass}>Módulos que este perfil pode ver</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {MODULOS_ORDENADOS.map((m) => (
            <label key={m} className="flex items-center gap-2 text-sm text-nevoa-700 dark:text-nevoa-300">
              <input type="checkbox" checked={selecionados.has(m)} onChange={() => alternarModulo(m)} className="accent-petroleo-600" />
              {MODULO_ROTULOS[m]}
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Botao type="button" onClick={salvarPermissoes} carregando={isPending} textoCarregando="Salvando…">
          Salvar permissões
        </Botao>
        {mensagem && mensagem.tipo === "erro" && <span className="text-sm text-vinho-600 dark:text-vinho-400">{mensagem.texto}</span>}
      </div>
      {mensagem && mensagem.tipo === "ok" && <Toast tipo="ok" texto={mensagem.texto} onClose={() => setMensagem(null)} />}
    </div>
  );
}

function NovoPerfilForm() {
  const { mensagem, setMensagem, isPending, executar } = useAcao();

  function salvar(formData: FormData) {
    executar(() => criarPerfil(formData), "Perfil criado.");
  }

  return (
    <form action={salvar} className={cardClass}>
      <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Criar novo perfil</h3>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor="novo-perfil-nome" className={labelClass}>
            Nome do perfil
          </label>
          <input id="novo-perfil-nome" name="nome" placeholder="Ex.: CEO, Financeiro" className={inputClass} />
        </div>
        <Botao type="submit" carregando={isPending} textoCarregando="Criando…">
          Criar
        </Botao>
      </div>
      {mensagem && mensagem.tipo === "erro" && <p className="text-sm text-vinho-600 dark:text-vinho-400">{mensagem.texto}</p>}
      {mensagem && mensagem.tipo === "ok" && <Toast tipo="ok" texto={mensagem.texto} onClose={() => setMensagem(null)} />}
    </form>
  );
}

function AdicionarUsuarioForm({ perfis }: { perfis: Perfil[] }) {
  const { mensagem, setMensagem, isPending, executar } = useAcao();

  function salvar(formData: FormData) {
    executar(() => convidarUsuario(formData), (resultado) =>
      resultado.jaExistia
        ? "Perfil vinculado. Esse e-mail já tinha conta — não foi enviado convite novo; peça pra essa pessoa entrar direto pela tela de login."
        : "Convite enviado e perfil vinculado.",
    );
  }

  if (perfis.length === 0) {
    return (
      <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Crie um perfil antes de vincular alguém a ele.</p>
    );
  }

  return (
    <form action={salvar} className="grid sm:grid-cols-4 gap-3 items-end">
      <div>
        <label htmlFor="add-email" className={labelClass}>
          E-mail
        </label>
        <input id="add-email" name="email" type="email" required placeholder="pessoa@exemplo.com" className={inputClass} />
      </div>
      <div>
        <label htmlFor="add-nome" className={labelClass}>
          Nome de exibição
        </label>
        <input id="add-nome" name="nome_exibicao" required placeholder="Ex.: CEO" className={inputClass} />
      </div>
      <div>
        <label htmlFor="add-perfil" className={labelClass}>
          Perfil
        </label>
        <select id="add-perfil" name="perfil_id" required className={inputClass}>
          {perfis.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </div>
      <Botao type="submit" carregando={isPending} textoCarregando="Convidando…">
        Convidar
      </Botao>
      {mensagem && mensagem.tipo === "erro" && (
        <p className="sm:col-span-4 text-sm text-vinho-600 dark:text-vinho-400">{mensagem.texto}</p>
      )}
      {mensagem && mensagem.tipo === "ok" && <Toast tipo="ok" texto={mensagem.texto} onClose={() => setMensagem(null)} />}
    </form>
  );
}

function LinhaUsuario({ usuario, perfilNome }: { usuario: UsuarioVinculado; perfilNome: string }) {
  const { mensagem, isPending, executar } = useAcao();

  function remover() {
    if (
      !window.confirm(
        `Remover "${usuario.email}" do perfil "${perfilNome}"? Ela volta a ter ACESSO TOTAL ao sistema (não perde o login, só deixa de ser filtrada por perfil).`,
      )
    )
      return;
    const fd = new FormData();
    fd.set("id", usuario.id);
    executar(() => desvincularUsuario(fd), "Vínculo removido.");
  }

  return (
    <tr className="border-t border-nevoa-200 dark:border-nevoa-800">
      <td className="py-2 pr-3 text-sm text-nevoa-800 dark:text-nevoa-200">{usuario.email}</td>
      <td className="py-2 pr-3 text-sm text-nevoa-800 dark:text-nevoa-200">{usuario.nomeExibicao}</td>
      <td className="py-2 pr-3 text-sm text-nevoa-800 dark:text-nevoa-200">{perfilNome}</td>
      <td className="py-2 text-right">
        <button
          type="button"
          onClick={remover}
          disabled={isPending}
          className="text-sm text-vinho-600 hover:underline dark:text-vinho-400 disabled:opacity-40"
        >
          Remover
        </button>
        {mensagem && mensagem.tipo === "erro" && <p className="text-xs text-vinho-600 dark:text-vinho-400 mt-1">{mensagem.texto}</p>}
      </td>
    </tr>
  );
}

export function AcessosPanel({ perfis, permissoesPorPerfil, usuarios }: {
  perfis: Perfil[];
  permissoesPorPerfil: Record<string, ModuloSistema[]>;
  usuarios: UsuarioVinculado[];
}) {
  const perfilNomePorId = new Map(perfis.map((p) => [p.id, p.nome]));

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="font-title text-lg font-semibold text-nevoa-900 dark:text-nevoa-50">Perfis e permissões</h2>
          <p className="text-sm text-nevoa-500 dark:text-nevoa-400">
            Cada perfil enxerga só os módulos marcados abaixo. Quem não estiver vinculado a nenhum perfil (seção
            seguinte) continua com acesso total — hoje isso vale pra você e pra quem já usa o sistema.
          </p>
        </div>
        {perfis.map((perfil) => (
          <PerfilCard key={perfil.id} perfil={perfil} modulosPermitidos={permissoesPorPerfil[perfil.id] ?? []} />
        ))}
        <NovoPerfilForm />
      </section>

      <section className={`${cardClass} space-y-4`}>
        <div>
          <h2 className="font-title text-lg font-semibold text-nevoa-900 dark:text-nevoa-50">Pessoas com acesso</h2>
          <p className="text-sm text-nevoa-500 dark:text-nevoa-400">
            Convide por e-mail e já escolha o perfil — a pessoa recebe um link pra criar acesso e, ao entrar, já
            enxerga só os módulos do perfil escolhido.
          </p>
        </div>
        {usuarios.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium uppercase tracking-wide text-nevoa-500 dark:text-nevoa-400">
                <th className="pb-2 pr-3">E-mail</th>
                <th className="pb-2 pr-3">Nome de exibição</th>
                <th className="pb-2 pr-3">Perfil</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <LinhaUsuario key={u.id} usuario={u} perfilNome={perfilNomePorId.get(u.perfilId) ?? "—"} />
              ))}
            </tbody>
          </table>
        )}
        <AdicionarUsuarioForm perfis={perfis} />
      </section>
    </div>
  );
}
