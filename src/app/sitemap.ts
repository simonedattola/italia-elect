import type { MetadataRoute } from "next";
import { dataCatalog } from "@/data/generated/registry";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const staticRoutes = ["", "/simulatore", "/archivio", "/metodologia", "/gioco"].map((path) => ({
    url: `${base}${path || "/"}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));
  const elections = dataCatalog.elections.map((item) => ({
    url: `${base}/archivio/${item.id}`,
    changeFrequency: "yearly" as const,
    priority: 0.5,
  }));
  return [...staticRoutes, ...elections];
}
