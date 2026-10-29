import { ApiError } from '@/lib/http/errors'

/** Static trademark list — stripped from every image prompt (in addition to artist/brand names). */
const TRADEMARKS = [
  'nike', 'adidas', 'supreme', 'nintendo', 'pokemon', 'pokémon', 'disney', 'marvel', 'carhartt',
  'sony', 'microsoft', 'xbox', 'playstation', 'star wars', 'harry potter', 'hello kitty', 'sanrio',
  'puma', 'reebok', 'converse', 'vans', 'levi\'s', 'levis', 'new balance', 'champion', 'the north face',
  'patagonia', 'stussy', 'stüssy', 'thrasher', 'bandai', 'funko', 'lego', 'coca-cola', 'pepsi',
  'starbucks', 'mcdonald\'s', 'mcdonalds', 'gucci', 'louis vuitton', 'prada', 'balenciaga',
]

/** Unsafe term blocklist — the whole request is rejected, not sanitized. */
const UNSAFE = [
  'gun', 'rifle', 'pistol', 'ammunition', 'ammo', 'weapon', 'knife', 'sword', 'grenade',
  'nude', 'nudity', 'nsfw', 'porn', 'sex', 'erotic', 'lingerie',
  'slur', 'hitler', 'nazi', 'swastika', 'kkk', 'suicide', 'gore', 'bloodbath',
  'cocaine', 'heroin', 'meth', 'weed', 'cannabis',
]

/** Phrases that request text/logos — removed (models garble text anyway). */
const TEXT_REQUESTS = [
  /\btext (?:that )?say(?:s|ing)?\b[^.,;]*/gi,
  /\b(?:the )?(?:words?|letters?|caption|wording)\s+(?:saying|reading|that say|that read)s?\b[^.,;]*/gi,
  /\b(?:a |the )?logo\b/gi,
  /\bslogans?\b/gi,
  /\bbrand names?\b/gi,
  /\btypography\b/gi,
  /\bscreen-?printed (?:text|lettering)\b/gi,
]

export interface ModerationInput {
  description: string
  artistName?: string
  brandNames: string[]
}

export interface ModerationResult {
  sanitized: string
  stripped: string[]
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Strip the artist name, Qloo-returned brand names and a static trademark list
 * (word-boundary, case-insensitive). Reject unsafe terms outright.
 */
export function moderate(input: ModerationInput): ModerationResult {
  const { description, artistName, brandNames } = input
  const stripped: string[] = []

  // 1. unsafe → reject
  const lower = description.toLowerCase()
  for (const term of UNSAFE) {
    if (new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i').test(lower)) {
      throw new ApiError('MODERATION_BLOCKED', "That description can't be turned into an image. Edit it and try again.")
    }
  }
  // real-person-name heuristic: "by <Name>" credits
  if (/\bby [A-Z][a-z]+ [A-Z][a-z]+\b/.test(description)) {
    throw new ApiError('MODERATION_BLOCKED', "That description can't be turned into an image. Edit it and try again.")
  }

  // 2. strip names + trademarks
  let sanitized = description
  const namesToStrip = [artistName, ...brandNames, ...TRADEMARKS].filter((n): n is string => Boolean(n && n.trim().length >= 2))
  for (const name of namesToStrip) {
    const re = new RegExp(`\\b${escapeRegExp(name.trim())}\\b`, 'gi')
    if (re.test(sanitized)) {
      stripped.push(name)
      sanitized = sanitized.replace(re, '')
    }
  }

  // 3. strip text/logo requests
  for (const re of TEXT_REQUESTS) {
    if (re.test(sanitized)) {
      sanitized = sanitized.replace(re, '')
    }
  }

  // 4. tidy whitespace
  sanitized = sanitized
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/\(\s*\)|,\s*,/g, ',')
    .replace(/^[\s,;:.]+/, '')
    .trim()

  return { sanitized, stripped }
}
