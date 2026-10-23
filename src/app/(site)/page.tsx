import { GameEntry } from "@/components/home/GameEntry";
import { dataCatalog } from "@/data/generated/registry";

export default function HomePage() {
  return <GameEntry scrutini={dataCatalog.elections.length} />;
}
