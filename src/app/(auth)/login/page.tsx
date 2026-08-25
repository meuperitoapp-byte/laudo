import { LoginForm } from "@/features/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return <LoginForm erroInicial={erro === "link_invalido" ? "link_invalido" : null} />;
}
