import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/features/auth/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defesa extra: o middleware já protege essa rota, mas custa pouco reforçar aqui.
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/processos" className="font-medium">
            Sistema de Laudos Periciais
          </Link>
          <Link href="/respostas-reutilizaveis" className="text-sm text-zinc-600 dark:text-zinc-400">
            Respostas reutilizáveis
          </Link>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">{user.email}</span>
          <form action={signOut}>
            <button type="submit" className="underline">
              Sair
            </button>
          </form>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
