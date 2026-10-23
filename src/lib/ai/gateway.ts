/**
 * Chiamate facoltative all'AI Gateway. Senza chiave il chiamante usa il fallback locale.
 * La chiave non viene scritta nei log né nella risposta.
 */

const GATEWAY = "https://ai-gateway.vercel.sh/v1";

let cachedModel: string | null | undefined;

function token(): string | null {
  const value = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  return value && value.trim() ? value.trim() : null;
}

async function resolveModel(key: string): Promise<string | null> {
  if (process.env.AI_GATEWAY_MODEL?.trim()) return process.env.AI_GATEWAY_MODEL.trim();
  if (cachedModel !== undefined) return cachedModel;
  try {
    const response = await fetch(`${GATEWAY}/models`, {
      headers: { authorization: `Bearer ${key}` },
    });
    if (!response.ok) {
      cachedModel = null;
      return null;
    }
    const body = (await response.json()) as { data?: { id?: string }[] };
    const id = body.data?.find((item) => item.id && !item.id.includes("embed"))?.id ?? null;
    cachedModel = id;
    return id;
  } catch {
    cachedModel = null;
    return null;
  }
}

export async function completeJson(system: string, user: string): Promise<string | null> {
  const key = token();
  if (!key) return null;
  const model = await resolveModel(key);
  if (!model) return null;
  try {
    const response = await fetch(`${GATEWAY}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user.slice(0, 800) },
        ],
      }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = body.choices?.[0]?.message?.content;
    return typeof content === "string" ? content : null;
  } catch {
    return null;
  }
}
