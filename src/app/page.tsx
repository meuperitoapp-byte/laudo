import { redirect } from "next/navigation";

export default function Home() {
  // O middleware já redireciona quem não está autenticado para /login antes
  // desta página renderizar — quem chega aqui está logado. /hoje é a porta
  // de entrada do sistema (decisão do Jeferson, 11/09/2026 — Central de
  // Prazos e Tarefas): a lista de processos fica a um clique dali.
  redirect("/hoje");
}
