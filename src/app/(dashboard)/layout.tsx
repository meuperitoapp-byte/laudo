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
      <header className="flex items-center justify-between border-b border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900 px-6 py-3.5">
        <div className="flex items-center gap-7">
          <Link
            href="/processos"
            className="font-title text-[15px] font-semibold text-petroleo-600 dark:text-petroleo-400"
          >
            Sistema de Laudos Periciais
          </Link>
          <Link
            href="/respostas-reutilizaveis"
            className="text-sm text-nevoa-600 hover:text-nevoa-900 dark:text-nevoa-400 dark:hover:text-nevoa-100"
          >
            Respostas reutilizáveis
          </Link>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-nevoa-500 dark:text-nevoa-400">{user.email}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="text-nevoa-600 hover:text-vinho-600 dark:text-nevoa-400 dark:hover:text-vinho-400"
            >
              Sair
            </button>
          </form>
        </div>
      </header>
      <div className="flex-1 bg-nevoa-25 dark:bg-nevoa-950">{children}</div>
    </div>
  );
}
