import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/ui/top-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  // `getSession()`, não `getUser()`: o middleware (src/lib/supabase/
  // middleware.ts) já validou o token contra o servidor do Supabase pra
  // ESTA MESMA requisição, momentos antes — repetir com getUser() aqui
  // pagaria uma segunda ida e volta de rede em TODA navegação dentro do
  // grupo (dashboard), sem ganho de segurança nenhum (não é uma nova
  // decisão de confiança, é só ler o que acabou de ser validado).
  // getSession() lê o cookie local, sem round-trip. Corrigido em 22/09/2026
  // (relato de lentidão ao trocar de módulo).
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  // Defesa extra: o middleware já protege essa rota, mas custa pouco reforçar aqui.
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav email={user.email ?? ""} />
      <div className="flex-1 bg-nevoa-25 dark:bg-nevoa-950">{children}</div>
    </div>
  );
}
