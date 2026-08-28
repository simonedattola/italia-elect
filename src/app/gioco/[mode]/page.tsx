import { notFound } from "next/navigation";
import { ModeWizard } from "@/components/game/wizard/ModeWizard";
import { getModeConfig } from "@/lib/game/modeConfig";

interface PageProps {
  params: Promise<{ mode: string }>;
}

export default async function ModePage({ params }: PageProps) {
  const { mode } = await params;
  const config = getModeConfig(mode);
  if (!config) notFound();
  return <ModeWizard config={config} />;
}

export function generateStaticParams() {
  return [{ mode: "multiplayer" }, { mode: "vscomputer" }, { mode: "livelli" }];
}
