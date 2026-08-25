import { redirect } from "next/navigation";

export default function Home() {
  // O middleware já redireciona quem não está autenticado para /login antes
  // desta página renderizar — quem chega aqui está logado.
  redirect("/processos");
}
