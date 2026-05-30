const API_KEY = import.meta.env.VITE_CLAUDE_KEY as string | undefined;
const MODEL = "claude-haiku-4-5-20251001";

export interface ParsedIntent {
  tags: string[];
  intent_type: "skill" | "social" | "trade" | "job" | "service" | "other";
  summary: string;
  region?: string;
  regions?: string[];
}

/**
 * Call Claude to parse the intent of a need and generate tags.
 * Falls back to local regex rules if the API key is missing or the call fails.
 */
export async function parseNeedIntent(
  text: string,
  context: { region?: string; regions?: string[] } = {},
): Promise<ParsedIntent> {
  if (!API_KEY) return localFallback(text, context);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: `你是一个供需平台的意图解析引擎。解析以下需求，返回纯 JSON，不要任何 markdown 或解释。

需求内容：「${text}」

返回格式：
{
  "tags": ["标签1","标签2","标签3"],  // 3-6个简短标签，描述需求的核心属性
  "intent_type": "skill|social|trade|job|service|other",  // 最匹配的一个
  "summary": "一句话摘要，不超过20字"
}`,
          },
        ],
      }),
    });

    if (!res.ok) return localFallback(text, context);

    const data = (await res.json()) as { content: Array<{ text: string }> };
    const raw = data.content?.[0]?.text ?? "";
    const jsonStr = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(jsonStr) as Partial<ParsedIntent>;

    return {
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 6) : localTags(text),
      intent_type: parsed.intent_type ?? "other",
      summary: parsed.summary ?? text.slice(0, 20),
      ...context,
    };
  } catch {
    return localFallback(text, context);
  }
}

// ── Local regex fallback (same rules as needs.tsx TAG_RULES) ──────────

const TAG_RULES: { match: RegExp; tags: string[] }[] = [
  { match: /(猫|狗|宠物|铲屎|喂养|遛|寄养)/, tags: ["宠物", "照护", "线下"] },
  { match: /(首尔|韩国|韩语)/, tags: ["首尔", "韩国"] },
  { match: /(东京|日本|日语|大阪)/, tags: ["东京", "日本"] },
  { match: /(上海|魔都)/, tags: ["上海"] },
  { match: /(北京|帝都)/, tags: ["北京"] },
  { match: /(纽约|旧金山|洛杉矶|美国|硅谷)/, tags: ["北美", "出海"] },
  { match: /(柏林|伦敦|巴黎|欧洲)/, tags: ["欧洲"] },
  { match: /(设计|视觉|UI|UX|插画|品牌)/, tags: ["设计"] },
  { match: /(开发|工程师|程序员|前端|后端|代码|技术合伙人)/, tags: ["技术"] },
  { match: /(投资|融资|VC|天使)/, tags: ["投资人"] },
  { match: /(营销|增长|推广|短视频|抖音|小红书|TikTok)/, tags: ["营销"] },
  { match: /(翻译|口译|笔译)/, tags: ["翻译"] },
  { match: /(线下|见面|碰面|喝咖啡|约饭)/, tags: ["线下"] },
  { match: /(远程|线上|视频|zoom)/i, tags: ["线上"] },
  { match: /(AI|人工智能|大模型|LLM|GPT)/i, tags: ["AI"] },
  { match: /(摄影|拍摄|约拍|形象照)/, tags: ["摄影"] },
  { match: /(音乐|乐队|demo|编曲)/i, tags: ["音乐"] },
  { match: /(学习|备考|搭子|TOPIK|JLPT)/, tags: ["学习搭子"] },
  { match: /(招聘|全职|兼职|实习|offer)/, tags: ["招聘"] },
  { match: /(BJD|人偶|手办)/, tags: ["BJD", "创意"] },
];

function localTags(text: string): string[] {
  const out = new Set<string>();
  for (const r of TAG_RULES) if (r.match.test(text)) r.tags.forEach((t) => out.add(t));
  if (out.size === 0) out.add("一般");
  return Array.from(out).slice(0, 5);
}

function guessIntentType(text: string): ParsedIntent["intent_type"] {
  if (/(招聘|全职|兼职|实习)/.test(text)) return "job";
  if (/(约饭|搭子|见面|交友|倾诉)/.test(text)) return "social";
  if (/(采购|供应|批发|出口|吨)/.test(text)) return "trade";
  if (/(设计|开发|插画|翻译|摄影)/.test(text)) return "skill";
  if (/(服务|维修|安装|配送)/.test(text)) return "service";
  return "other";
}

function localFallback(
  text: string,
  context: { region?: string; regions?: string[] },
): ParsedIntent {
  return {
    tags: localTags(text),
    intent_type: guessIntentType(text),
    summary: text.slice(0, 20),
    ...context,
  };
}
