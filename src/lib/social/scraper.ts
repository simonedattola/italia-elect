import { ageToBand } from "../agents/agcomMatrix";
import type { DigitalAgent } from "../agents/types";

export interface SocialPost {
  id: string;
  platform: string;
  author: string;
  authorCredibility: number;
  sentiment: number;
  engagement: number;
  targetAgeBands: string[];
  partySlug?: string;
  text: string;
  publishedAt: string;
}

/** Mock/open: deriva post da contesto pubblico (no API social a pagamento). */
export async function scrapeSocialPosts(): Promise<SocialPost[]> {
  const now = new Date().toISOString();
  return [
    {
      id: "post_meloni_1",
      platform: "x",
      author: "Giorgia Meloni",
      authorCredibility: 0.92,
      sentiment: 0.35,
      engagement: 0.85,
      targetAgeBands: ["25-34", "35-44", "45-54"],
      partySlug: "fratelli-ditalia",
      text: "Italia al centro delle decisioni europee.",
      publishedAt: now,
    },
    {
      id: "post_pd_1",
      platform: "facebook",
      author: "Partito Democratico",
      authorCredibility: 0.78,
      sentiment: 0.1,
      engagement: 0.55,
      targetAgeBands: ["35-44", "45-54", "55-64"],
      partySlug: "partito-democratico",
      text: "Diritti, lavoro e servizi pubblici.",
      publishedAt: now,
    },
    {
      id: "post_m5s_1",
      platform: "instagram",
      author: "M5S",
      authorCredibility: 0.65,
      sentiment: -0.15,
      engagement: 0.45,
      targetAgeBands: ["18-24", "25-34"],
      partySlug: "movimento-5-stelle",
      text: "Trasparenza e partecipazione.",
      publishedAt: now,
    },
  ];
}

export function postsForAgent(agent: DigitalAgent, posts: SocialPost[]): SocialPost[] {
  const band = ageToBand(agent.age);
  return posts.filter((p) => p.targetAgeBands.includes(band));
}
