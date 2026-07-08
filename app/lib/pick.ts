import { episodes, type Episode } from "../data/episodes";

export type Topic = { label: string; emoji: string; keywords: string[] };

// Suggested interests. Each maps to keywords matched against the guest name + bio.
export const TOPICS: Topic[] = [
  {
    label: "Crypto & Bitcoin",
    emoji: "₿",
    keywords: ["bitcoin", "crypto", "blockchain", "satoshi", "btc", "mining", "wallet", "stablecoin"],
  },
  {
    label: "Ethereum & Web3",
    emoji: "◆",
    keywords: ["ethereum", "web3", "defi", "nft", "dao", "token", "solana", "onchain", "farcaster", "protocol"],
  },
  {
    label: "Startups & Founders",
    emoji: "🚀",
    keywords: ["founder", "co-founder", "entrepreneur", "startup", "ceo", "building", "launched", "company"],
  },
  {
    label: "Investing & VC",
    emoji: "📈",
    keywords: ["investor", "venture", "vc", "fund", "angel", "capital", "partner", "portfolio", "finance"],
  },
  {
    label: "Health & Longevity",
    emoji: "🧬",
    keywords: ["longevity", "aging", "health", "biotech", "medicine", "wellness", "fitness", "nutrition", "brain", "science"],
  },
  {
    label: "AI & Engineering",
    emoji: "🤖",
    keywords: ["ai", "artificial intelligence", "machine learning", "engineer", "developer", "software", "robotics", "data"],
  },
  {
    label: "Art & Music",
    emoji: "🎨",
    keywords: ["artist", "art", "music", "musician", "design", "designer", "film", "creative", "creator", "painter"],
  },
  {
    label: "Writing & Ideas",
    emoji: "✍️",
    keywords: ["writer", "author", "writing", "book", "philosophy", "essay", "journalist", "blog", "media", "podcast"],
  },
  {
    label: "Cities & Community",
    emoji: "🏙️",
    keywords: ["city", "urban", "real estate", "network state", "community", "energy", "climate"],
  },
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const tokenize = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);

export type ScoredEpisode = Episode & { score: number };

// Score every episode against the chosen topic keywords + free-text query.
// Guest-name hits weigh more than bio hits so typing a name surfaces that guest.
export function scoreEpisodes(topicKeywords: string[], freeText: string): ScoredEpisode[] {
  const keywords = Array.from(new Set([...topicKeywords, ...tokenize(freeText)]));
  if (keywords.length === 0) return [];

  const matchers = keywords.map((kw) => new RegExp(`\\b${escape(kw)}\\b`, "i"));

  return episodes
    .map((ep) => {
      const guest = ep.guest.toLowerCase();
      const bio = ep.desc.toLowerCase();
      let score = 0;
      for (const re of matchers) {
        if (re.test(guest)) score += 3;
        if (re.test(bio)) score += 1;
      }
      return { ...ep, score };
    })
    .filter((ep) => ep.score > 0)
    .sort((a, b) => b.score - a.score);
}

// Pick one episode from the strongest matches, avoiding ones already shown.
// Returns { episode, matched } — matched=false means we fell back to a wildcard.
export function pick(
  topicKeywords: string[],
  freeText: string,
  exclude: number[] = []
): { episode: Episode; matched: boolean } | null {
  const scored = scoreEpisodes(topicKeywords, freeText);

  if (scored.length > 0) {
    // Take the top tier, then a random pick within it for variety on re-rolls.
    const topScore = scored[0].score;
    const strong = scored.filter((e) => e.score >= Math.max(topScore - 1, 1));
    const pool = strong.filter((e) => !exclude.includes(e.num));
    const from = pool.length > 0 ? pool : scored.filter((e) => !exclude.includes(e.num));
    if (from.length > 0) {
      const choice = from[Math.floor(Math.random() * Math.min(from.length, 15))] ?? from[0];
      return { episode: choice, matched: true };
    }
  }

  // No matches (or exhausted) — return a wildcard episode.
  const remaining = episodes.filter((e) => !exclude.includes(e.num));
  const pool = remaining.length > 0 ? remaining : episodes;
  const choice = pool[Math.floor(Math.random() * pool.length)];
  return { episode: choice, matched: scored.length > 0 };
}

export const EPISODE_COUNT = episodes.length;
