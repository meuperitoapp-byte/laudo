import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/ui/top-nav";

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
      <TopNav email={user.email ?? ""} />
      <div className="flex-1 bg-nevoa-25 dark:bg-nevoa-950">{children}</div>
    </div>
  );
}
