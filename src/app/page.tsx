import { redirect } from "next/navigation";

export default function Home() {
  // O middleware já redireciona quem não está autenticado para /login antes
  // desta página renderizar — quem chega aqui está logado. /dashboard é a
  // porta de entrada do sistema (decisão do Jeferson, 19/09/2026, pedido da
  // Dra. Fernanda) — /hoje (Central de Prazos) fica a um clique dali.
  redirect("/dashboard");
}
