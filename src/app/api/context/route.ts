import { loadNewsFactors, loadPollContext, loadSocialSentiment } from "@/lib/model/adapters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [polls, news, social] = await Promise.all([loadPollContext(), loadNewsFactors(), loadSocialSentiment()]);
  return Response.json({
    polls: {
      note: polls.aggregate.note,
      shares: polls.aggregate.shares,
      quality: polls.aggregate.quality,
      pollCount: polls.aggregate.pollCount,
    },
    news,
    social,
  });
}
