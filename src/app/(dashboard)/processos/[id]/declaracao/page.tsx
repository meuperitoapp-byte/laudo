import { AtestadoPageContent } from "@/features/atestados/atestado-page-content";

export default async function DeclaracaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AtestadoPageContent processoId={id} tipoDocumento="declaracao" />;
}
