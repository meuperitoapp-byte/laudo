/**
 * Destino de quem está logado, tem um perfil restrito, mas esse perfil não
 * tem NENHUM módulo liberado ainda (ex.: perfil recém-criado, antes de ela
 * marcar os checkboxes em Configurações -> Gerenciar perfis de acesso).
 * Sem isso, essa pessoa cairia num loop de redirecionamento (todo módulo
 * bloqueado -> tenta mandar pro "primeiro módulo liberado" -> não existe
 * nenhum).
 */
export default function SemAcessoPage() {
  return (
    <main className="p-8 max-w-lg mx-auto">
      <div className="rounded-xl border border-dashed border-nevoa-300 dark:border-nevoa-700 px-6 py-10 text-center space-y-3">
        <h1 className="font-title text-lg font-semibold text-nevoa-900 dark:text-nevoa-50">Nenhum módulo liberado ainda</h1>
        <p className="text-sm text-nevoa-600 dark:text-nevoa-400">
          Seu acesso está ativo, mas o perfil vinculado a você ainda não tem nenhuma tela liberada. Fale com a Dra.
          Fernanda pra ela marcar o que você pode ver em Configurações → Gerenciar perfis de acesso.
        </p>
      </div>
    </main>
  );
}
