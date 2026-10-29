import type { EntityType } from '@/types'
import type { QlooEntity, QlooTag } from './types'
import { rankWeight } from './normalize'

/**
 * SAMPLE DATA — not Qloo output.
 *
 * Synthetic taste database used ONLY when no QLOO_API_KEY is configured
 * (or MERCHDESK_DATA_MODE=fixtures). Every surface that shows this data
 * labels it as sample data. It is keyword-matched so the demo feels alive
 * for arbitrary fan descriptions, but it is hand-written, not real affinity.
 */

interface FixtureScene {
  id: string
  keywords: string[]
  artists: Array<{ name: string; tags: string[] }>
  tasteTags: string[]
  brands: Array<{ name: string; cats: string[]; tier: 'budget' | 'mid' | 'premium'; tags: string[] }>
  crossDomain: Partial<Record<EntityType, Array<{ name: string; tags: string[] }>>>
  places: Array<{ name: string; kind: string; tags: string[] }>
}

const SCENES: FixtureScene[] = [
  {
    id: 'midwest-emo',
    keywords: ['emo', 'midwest emo', 'screamo', 'diy punk', 'college rock', 'indie rock', 'guitar', 'band', 'emo revival', 'sad', 'craft beer', 'sour beer', 'brewery', 'flannel', 'thrift'],
    artists: [
      { name: 'American Football', tags: ['emo', 'indie', '90s'] },
      { name: 'Mineral', tags: ['emo', 'indie'] },
      { name: "Cap'n Jazz", tags: ['emo', 'punk', 'indie'] },
      { name: 'Owen', tags: ['emo', 'folk', 'indie'] },
      { name: 'Foxing', tags: ['emo', 'indie'] },
    ],
    tasteTags: ['midwest emo', 'indie rock', 'vintage', 'thrift', 'vinyl', '90s', 'zines', 'craft beer', 'coffee', 'retro gaming', 'handmade', 'punk'],
    brands: [
      { name: 'Dickies', cats: ['workwear', 'skate'], tier: 'budget', tags: ['workwear', 'skate', 'vintage'] },
      { name: 'New Balance', cats: ['sportswear', 'streetwear'], tier: 'mid', tags: ['streetwear', '90s'] },
      { name: 'Carhartt', cats: ['workwear', 'outdoor', 'streetwear'], tier: 'mid', tags: ['workwear', 'streetwear'] },
      { name: 'Converse', cats: ['streetwear', 'vintage-americana'], tier: 'budget', tags: ['punk', 'vintage'] },
      { name: 'Stüssy', cats: ['streetwear', 'skate'], tier: 'premium', tags: ['streetwear', 'skate'] },
      { name: 'Stanley', cats: ['outdoor', 'home-goods'], tier: 'mid', tags: ['outdoors', 'coffee'] },
      { name: "Levi's", cats: ['vintage-americana', 'workwear'], tier: 'mid', tags: ['vintage', 'thrift'] },
      { name: 'Thrasher', cats: ['skate', 'streetwear'], tier: 'mid', tags: ['skate', 'punk'] },
    ],
    crossDomain: {
      videogame: [
        { name: 'Stardew Valley', tags: ['retro-gaming', 'cozy', 'indie'] },
        { name: 'Pokémon', tags: ['retro-gaming', 'collectible', '90s'] },
        { name: 'The Legend of Zelda', tags: ['retro-gaming', 'fantasy'] },
        { name: 'Animal Crossing', tags: ['retro-gaming', 'cozy'] },
      ],
      tv_show: [
        { name: 'Twin Peaks', tags: ['cinema', '90s', 'horror'] },
        { name: 'Freaks and Geeks', tags: ['90s', 'vintage'] },
      ],
      book: [
        { name: 'The Perks of Being a Wallflower', tags: ['books', 'emo', '90s'] },
        { name: 'Norwegian Wood', tags: ['books', 'indie'] },
      ],
    },
    places: [
      { name: 'The Treehouse Lounge', kind: 'DIY venue', tags: ['nightlife', 'indie'] },
      { name: 'Fourth Street Brewery', kind: 'craft brewery', tags: ['craft-beer', 'nightlife'] },
      { name: 'Sunny Side Records', kind: 'record shop', tags: ['vinyl', 'thrift'] },
      { name: 'Mud Kingdom Coffee', kind: 'coffee shop', tags: ['coffee', 'cozy'] },
      { name: 'Rag Trade Vintage', kind: 'vintage store', tags: ['thrift', 'vintage'] },
      { name: 'The Pin Hook', kind: 'bar + venue', tags: ['nightlife', 'indie'] },
    ],
  },
  {
    id: 'retro-gaming',
    keywords: ['retro', 'gaming', 'gamer', 'video game', 'video games', 'arcade', 'nintendo', 'pixel', 'console', 'speedrun', '8-bit', 'youtube', 'twitch', 'streamer', 'esports'],
    artists: [
      { name: 'CHON', tags: ['electronic', 'indie'] },
      { name: 'Anamanaguchi', tags: ['electronic', 'retro'] },
      { name: 'Yuzo Koshiro', tags: ['electronic', 'retro'] },
    ],
    tasteTags: ['retro gaming', 'anime', 'collectible', 'electronic', '90s', 'y2k', 'esports', 'streetwear', 'pop', 'cassette', 'skate'],
    brands: [
      { name: 'Casio', cats: ['home-goods', 'gaming'], tier: 'budget', tags: ['retro', 'y2k'] },
      { name: 'New Balance', cats: ['sportswear', 'streetwear'], tier: 'mid', tags: ['streetwear', 'retro'] },
      { name: 'Bandai Namco', cats: ['gaming'], tier: 'mid', tags: ['retro-gaming', 'collectible'] },
      { name: 'Uniqlo', cats: ['boutique-fashion'], tier: 'budget', tags: ['anime', 'minimal'] },
      { name: 'Funko', cats: ['gaming', 'collectibles'], tier: 'budget', tags: ['collectible', 'pop'] },
      { name: 'Supreme', cats: ['streetwear', 'skate'], tier: 'premium', tags: ['streetwear', 'skate'] },
      { name: 'Vans', cats: ['skate', 'streetwear'], tier: 'mid', tags: ['skate', 'retro'] },
    ],
    crossDomain: {
      videogame: [
        { name: 'Sonic the Hedgehog', tags: ['retro-gaming', '90s'] },
        { name: 'Street Fighter II', tags: ['retro-gaming', 'esports'] },
        { name: 'Final Fantasy VI', tags: ['retro-gaming', 'fantasy'] },
        { name: 'Chrono Trigger', tags: ['retro-gaming', 'fantasy'] },
        { name: 'Mega Man', tags: ['retro-gaming', 'sci-fi'] },
      ],
      tv_show: [
        { name: 'Dragon Ball Z', tags: ['anime', 'retro-gaming'] },
        { name: 'Sailor Moon', tags: ['anime', 'y2k'] },
      ],
      movie: [{ name: 'The Matrix', tags: ['sci-fi', 'y2k'] }],
    },
    places: [
      { name: 'Pixel Palace Arcade', kind: 'arcade bar', tags: ['retro-gaming', 'nightlife'] },
      { name: 'Insert Coin Café', kind: 'gaming café', tags: ['coffee', 'retro-gaming'] },
      { name: 'Cartridge Corner', kind: 'game shop', tags: ['retro-gaming', 'collectible'] },
      { name: 'Level Up Brews', kind: 'arcade brewery', tags: ['craft-beer', 'retro-gaming'] },
      { name: 'The D-Pad Diner', kind: 'themed diner', tags: ['foodie', 'retro-gaming'] },
    ],
  },
  {
    id: 'podcast-foodie',
    keywords: ['podcast', 'true crime', 'food', 'foodie', 'cooking', 'restaurant', 'storytelling', 'comedy podcast', 'talk', 'kitchen', 'spicy'],
    artists: [
      { name: 'The Front Porch Sessions', tags: ['foodie', 'folk'] },
      { name: 'Midnight Case Files', tags: ['horror', 'books'] },
      { name: 'Two Chefs One Mic', tags: ['foodie', 'foodie'] },
    ],
    tasteTags: ['foodie', 'books', 'coffee', 'horror', 'cozy', 'nightlife', 'craft beer', 'hot sauce', 'tea', 'art-print', 'indie', 'vintage'],
    brands: [
      { name: 'Stumptown Coffee', cats: ['coffee-culture', 'craft-food'], tier: 'mid', tags: ['coffee', 'cozy'] },
      { name: 'Blue Bottle', cats: ['coffee-culture', 'craft-food'], tier: 'premium', tags: ['coffee', 'minimal'] },
      { name: 'Tapatío', cats: ['craft-food'], tier: 'budget', tags: ['hot-sauce', 'foodie'] },
      { name: 'Stanley', cats: ['outdoor', 'home-goods'], tier: 'mid', tags: ['coffee', 'cozy'] },
      { name: 'Moleskine', cats: ['publishing', 'home-goods'], tier: 'mid', tags: ['books', 'minimal'] },
      { name: 'Penguin Books', cats: ['publishing'], tier: 'mid', tags: ['books', 'true crime'] },
      { name: 'Muji', cats: ['home-goods', 'boutique-fashion'], tier: 'mid', tags: ['minimal', 'cozy'] },
    ],
    crossDomain: {
      podcast: [
        { name: 'This Podcast Will Kill You', tags: ['horror', 'foodie'] },
        { name: 'Gastronomica', tags: ['foodie', 'books'] },
        { name: 'The NoSleep Podcast', tags: ['horror', 'nightlife'] },
      ],
      book: [
        { name: 'I\'ll Be Gone in the Dark', tags: ['books', 'horror'] },
        { name: 'Salt, Fat, Acid, Heat', tags: ['books', 'foodie'] },
      ],
      tv_show: [{ name: 'Chef\'s Table', tags: ['foodie', 'cinema'] }],
    },
    places: [
      { name: 'The Copper Kettle', kind: 'café', tags: ['coffee', 'cozy'] },
      { name: 'Ferment Station', kind: 'craft brewery', tags: ['craft-beer', 'foodie'] },
      { name: 'Spice Merchant Market', kind: 'specialty shop', tags: ['hot-sauce', 'foodie'] },
      { name: 'Binding & Brews', kind: 'bookshop café', tags: ['books', 'coffee'] },
      { name: 'The Green Fork', kind: 'farm-to-table restaurant', tags: ['foodie', 'eco'] },
    ],
  },
  {
    id: 'hiphop',
    keywords: ['hip hop', 'hip-hop', 'rap', 'trap', 'r&b', 'drill', 'grime', 'beats'],
    artists: [
      { name: 'Mick Jenkins', tags: ['hiphop', 'indie'] },
      { name: 'Noname', tags: ['hiphop', 'books'] },
      { name: 'Little Simz', tags: ['hiphop', 'streetwear'] },
    ],
    tasteTags: ['hiphop', 'streetwear', 'collectible', 'vinyl', 'nightlife', 'luxury', 'sneakers', 'y2k', 'electronic', 'art-print', 'foodie'],
    brands: [
      { name: 'Supreme', cats: ['streetwear', 'skate'], tier: 'premium', tags: ['streetwear', 'skate'] },
      { name: 'Nike', cats: ['sportswear', 'streetwear'], tier: 'premium', tags: ['streetwear', 'sportswear'] },
      { name: 'Carhartt', cats: ['workwear', 'streetwear'], tier: 'mid', tags: ['workwear', 'streetwear'] },
      { name: 'Champion', cats: ['sportswear', 'streetwear'], tier: 'budget', tags: ['streetwear', 'vintage'] },
      { name: 'New Era', cats: ['sportswear'], tier: 'mid', tags: ['streetwear', 'collectible'] },
      { name: 'Stüssy', cats: ['streetwear'], tier: 'premium', tags: ['streetwear', 'vintage'] },
    ],
    crossDomain: {
      videogame: [
        { name: 'NBA Street', tags: ['retro-gaming', 'hiphop'] },
        { name: 'Def Jam Vendetta', tags: ['retro-gaming', 'hiphop'] },
      ],
      movie: [{ name: 'Do the Right Thing', tags: ['cinema', 'streetwear'] }],
      tv_show: [{ name: 'Atlanta', tags: ['cinema', 'hiphop'] }],
    },
    places: [
      { name: 'The Boombox Room', kind: 'venue', tags: ['nightlife', 'hiphop'] },
      { name: 'Grape & Grain Wine Bar', kind: 'wine bar', tags: ['nightlife', 'foodie'] },
      { name: 'Second Verse Thrift', kind: 'thrift store', tags: ['thrift', 'streetwear'] },
      { name: 'Beat Street Records', kind: 'record shop', tags: ['vinyl', 'hiphop'] },
    ],
  },
  {
    id: 'electronic',
    keywords: ['electronic', 'edm', 'techno', 'house', 'dj', 'rave', 'synth', 'ambient', 'dance'],
    artists: [
      { name: 'Bonobo', tags: ['electronic', 'cozy'] },
      { name: 'Four Tet', tags: ['electronic', 'indie'] },
      { name: 'Jamie xx', tags: ['electronic', 'nightlife'] },
    ],
    tasteTags: ['electronic', 'nightlife', 'festival', 'techwear', 'minimal', 'y2k', 'travel', 'esports', 'vinyl'],
    brands: [
      { name: 'Arc\'teryx', cats: ['outdoor', 'techwear'], tier: 'premium', tags: ['techwear', 'outdoors'] },
      { name: 'Nike', cats: ['sportswear', 'streetwear'], tier: 'premium', tags: ['techwear', 'streetwear'] },
      { name: 'Casio', cats: ['home-goods'], tier: 'budget', tags: ['y2k', 'electronic'] },
      { name: 'Hydro Flask', cats: ['outdoor', 'home-goods'], tier: 'mid', tags: ['festival', 'outdoors'] },
      { name: 'Salomon', cats: ['outdoor', 'sportswear'], tier: 'premium', tags: ['techwear', 'outdoors'] },
    ],
    crossDomain: {
      videogame: [
        { name: 'Rez', tags: ['retro-gaming', 'electronic'] },
        { name: 'WipEout', tags: ['retro-gaming', 'electronic'] },
      ],
      movie: [{ name: 'Blade Runner 2049', tags: ['sci-fi', 'electronic'] }],
    },
    places: [
      { name: 'Warehouse 44', kind: 'club', tags: ['nightlife', 'electronic'] },
      { name: 'Loop Bar', kind: 'cocktail bar', tags: ['nightlife', 'minimal'] },
      { name: 'Signal Records', tags: ['vinyl', 'electronic'], kind: 'record shop' },
    ],
  },
  {
    id: 'folk-outdoors',
    keywords: ['folk', 'acoustic', 'campfire', 'hiking', 'outdoors', 'nature', 'climbing', 'van life', 'americana', 'country', 'bluegrass'],
    artists: [
      { name: 'Gregory Alan Isakov', tags: ['folk', 'outdoors'] },
      { name: 'The Tallest Man on Earth', tags: ['folk', 'indie'] },
      { name: 'Sarah Jarosz', tags: ['folk', 'vintage'] },
    ],
    tasteTags: ['folk', 'outdoors', 'vintage', 'workwear', 'coffee', 'craft beer', 'travel', 'eco', 'handmade', 'vinyl', 'cozy'],
    brands: [
      { name: 'Patagonia', cats: ['outdoor', 'eco-goods'], tier: 'premium', tags: ['outdoors', 'eco'] },
      { name: 'Filson', cats: ['workwear', 'outdoor'], tier: 'premium', tags: ['workwear', 'outdoors'] },
      { name: 'Stanley', cats: ['outdoor', 'home-goods'], tier: 'mid', tags: ['outdoors', 'coffee'] },
      { name: 'Darn Tough', cats: ['outdoor'], tier: 'mid', tags: ['outdoors', 'handmade'] },
      { name: 'Pendleton', cats: ['vintage-americana', 'home-goods'], tier: 'premium', tags: ['vintage', 'outdoors'] },
      { name: 'Hydro Flask', cats: ['outdoor'], tier: 'mid', tags: ['outdoors', 'travel'] },
    ],
    crossDomain: {
      book: [
        { name: 'Desert Solitaire', tags: ['books', 'outdoors'] },
        { name: 'Braiding Sweetgrass', tags: ['books', 'eco'] },
      ],
      movie: [{ name: 'Into the Wild', tags: ['cinema', 'outdoors'] }],
      videogame: [{ name: 'Firewatch', tags: ['retro-gaming', 'outdoors'] }],
    },
    places: [
      { name: 'Ridgeline Outfitters', kind: 'outdoor shop', tags: ['outdoors', 'workwear'] },
      { name: 'Trailhead Brewing', kind: 'craft brewery', tags: ['craft-beer', 'outdoors'] },
      { name: 'Campfire Coffee Roasters', kind: 'coffee roaster', tags: ['coffee', 'outdoors'] },
      { name: 'The Wander Inn', kind: 'lodge bar', tags: ['nightlife', 'outdoors'] },
    ],
  },
  {
    id: 'anime-pop',
    keywords: ['anime', 'manga', 'k-pop', 'kpop', 'j-pop', 'cosplay', 'idol', 'vocaloid', 'sanrio'],
    artists: [
      { name: 'YOASOBI', tags: ['pop', 'anime'] },
      { name: 'Kenshi Yonezu', tags: ['pop', 'anime'] },
      { name: 'TWICE', tags: ['pop', 'collectible'] },
    ],
    tasteTags: ['anime', 'pop', 'collectible', 'cute', 'pastel', 'maximalist', 'retro gaming', 'art-print', 'streetwear', 'foodie'],
    brands: [
      { name: 'Uniqlo', cats: ['boutique-fashion'], tier: 'budget', tags: ['anime', 'minimal'] },
      { name: 'Funko', cats: ['gaming', 'collectibles'], tier: 'budget', tags: ['collectible', 'pop'] },
      { name: 'Bandai Namco', cats: ['gaming'], tier: 'mid', tags: ['anime', 'collectible'] },
      { name: 'Sanrio', cats: ['collectibles'], tier: 'mid', tags: ['pop', 'collectible'] },
      { name: 'Muji', cats: ['home-goods'], tier: 'mid', tags: ['minimal', 'cozy'] },
    ],
    crossDomain: {
      videogame: [
        { name: 'Persona 5', tags: ['retro-gaming', 'anime'] },
        { name: 'Final Fantasy VII', tags: ['retro-gaming', 'anime'] },
      ],
      book: [{ name: 'Sailor Moon Manga', tags: ['anime', 'books'] }],
      tv_show: [{ name: 'Mob Psycho 100', tags: ['anime', 'electronic'] }],
    },
    places: [
      { name: 'Sakura Station', kind: 'bubble tea café', tags: ['foodie', 'anime'] },
      { name: 'Kiki\'s Kawaii Shop', kind: 'gift shop', tags: ['collectible', 'pop'] },
      { name: 'Neo Tokyo Arcade', kind: 'arcade', tags: ['retro-gaming', 'nightlife'] },
    ],
  },
  {
    id: 'metal-punk',
    keywords: ['metal', 'heavy', 'hardcore', 'punk', 'doom', 'thrash', 'hard rock', 'mosh'],
    artists: [
      { name: 'High on Fire', tags: ['metal', 'punk'] },
      { name: 'Knocked Loose', tags: ['metal', 'punk'] },
      { name: 'Chelsea Wolfe', tags: ['metal', 'horror'] },
    ],
    tasteTags: ['metal', 'punk', 'horror', 'vintage', 'craft beer', 'nightlife', 'collectible', 'workwear', 'skate', 'vinyl'],
    brands: [
      { name: 'Dickies', cats: ['workwear', 'skate'], tier: 'budget', tags: ['workwear', 'punk'] },
      { name: 'Vans', cats: ['skate', 'streetwear'], tier: 'mid', tags: ['skate', 'punk'] },
      { name: 'Dr. Martens', cats: ['streetwear'], tier: 'premium', tags: ['punk', 'streetwear'] },
      { name: 'Carhartt', cats: ['workwear'], tier: 'mid', tags: ['workwear', 'metal'] },
      { name: 'Metallica Merch', cats: ['streetwear'], tier: 'mid', tags: ['metal', 'collectible'] },
    ],
    crossDomain: {
      movie: [
        { name: 'The Thing', tags: ['horror', 'cinema'] },
        { name: 'Heavy Metal Parking Lot', tags: ['metal', 'cinema'] },
      ],
      videogame: [{ name: 'Doom', tags: ['retro-gaming', 'metal'] }],
      book: [{ name: 'Lords of Chaos', tags: ['books', 'metal'] }],
    },
    places: [
      { name: 'The Rusty Nail', kind: 'dive bar', tags: ['nightlife', 'metal'] },
      { name: 'Hell\'s Kitchen Taproom', kind: 'metal bar', tags: ['craft-beer', 'metal'] },
      { name: 'Black Wax Records', kind: 'record shop', tags: ['vinyl', 'metal'] },
    ],
  },
  {
    id: 'generic-indie',
    keywords: [],
    artists: [
      { name: 'The Paper Kites', tags: ['indie', 'folk'] },
      { name: 'Men I Trust', tags: ['indie', 'electronic'] },
      { name: 'Alvvays', tags: ['indie', 'pop'] },
    ],
    tasteTags: ['indie', 'vintage', 'coffee', 'vinyl', 'art-print', 'books', 'thrift', 'cozy', 'zines', 'streetwear'],
    brands: [
      { name: 'Converse', cats: ['streetwear', 'vintage-americana'], tier: 'budget', tags: ['indie', 'vintage'] },
      { name: 'Urban Outfitters', cats: ['boutique-fashion'], tier: 'mid', tags: ['indie', 'thrift'] },
      { name: 'Stanley', cats: ['outdoor', 'home-goods'], tier: 'mid', tags: ['coffee', 'outdoors'] },
      { name: 'Penguin Books', cats: ['publishing'], tier: 'mid', tags: ['books'] },
      { name: 'New Balance', cats: ['sportswear', 'streetwear'], tier: 'mid', tags: ['streetwear', 'indie'] },
      { name: 'Muji', cats: ['home-goods'], tier: 'mid', tags: ['minimal', 'cozy'] },
    ],
    crossDomain: {
      book: [{ name: 'Just Kids', tags: ['books', 'art-print'] }],
      movie: [{ name: 'Frances Ha', tags: ['cinema', 'indie'] }],
      videogame: [{ name: 'Unpacking', tags: ['retro-gaming', 'cozy'] }],
    },
    places: [
      { name: 'The Daily Grind', kind: 'coffee shop', tags: ['coffee', 'cozy'] },
      { name: 'Reclaimed Brewing', kind: 'craft brewery', tags: ['craft-beer', 'eco'] },
      { name: 'Yellow Door Vintage', kind: 'vintage store', tags: ['thrift', 'vintage'] },
      { name: 'The Gallery Bar', kind: 'art bar', tags: ['nightlife', 'art-print'] },
    ],
  },
]

function pickScene(query: string): FixtureScene {
  const q = query.toLowerCase().replace(/-/g, ' ')
  let best: { scene: FixtureScene; score: number } | null = null
  for (const scene of SCENES) {
    let score = 0
    for (const kw of scene.keywords) {
      if (q.includes(kw)) score += kw.length // longer matches weigh more
    }
    if (score > 0 && (!best || score > best.score)) best = { scene, score }
  }
  return best?.scene ?? SCENES[SCENES.length - 1]
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function entityFrom(sceneId: string, name: string, type: EntityType, tags: string[], index: number, total: number, location?: string): QlooEntity {
  return {
    id: `fixture:${sceneId}:${type}:${slug(name)}`,
    name,
    type,
    weight: rankWeight(index, total),
    tags,
    location,
  }
}

export function fixtureSearchEntities(query: string, type: 'artist' | 'brand' | 'place', take = 5): QlooEntity[] {
  const scene = pickScene(query)
  const q = query.toLowerCase()
  if (type === 'artist') {
    // try a name match across ALL scenes first (so known names resolve → Path A)
    const all = SCENES.flatMap((s) => s.artists.map((a) => ({ scene: s, artist: a })))
    const byName = all.filter(({ artist }) => artist.name.toLowerCase().includes(q) || q.includes(artist.name.toLowerCase()))
    if (byName.length > 0) {
      const sceneId = byName[0].scene.id
      return byName.slice(0, take).map(({ artist }, i) =>
        entityFrom(sceneId, artist.name, 'artist', artist.tags, i, Math.min(take, byName.length))
      )
    }
    const matches = scene.artists.filter((a) => a.name.toLowerCase().includes(q))
    const list = matches.length > 0 ? matches : scene.artists
    return list.slice(0, take).map((a, i) => entityFrom(scene.id, a.name, 'artist', a.tags, i, Math.min(take, list.length)))
  }
  if (type === 'brand') {
    return scene.brands.slice(0, take).map((b, i) => entityFrom(scene.id, b.name, 'brand', b.tags, i, Math.min(take, scene.brands.length)))
  }
  return scene.places.slice(0, take).map((p, i) => entityFrom(scene.id, p.name, 'place', p.tags, i, Math.min(take, scene.places.length), p.kind))
}

export function fixtureSearchTags(query: string, take = 5): QlooTag[] {
  const scene = pickScene(query)
  const q = query.toLowerCase()
  const all = scene.tasteTags
  const direct = all.filter((t) => t.toLowerCase().includes(q))
  const list = direct.length > 0 ? direct : all
  return list.slice(0, take).map((name, i) => ({
    id: `fixture:tag:${slug(name)}`,
    name,
    weight: rankWeight(i, Math.min(take, list.length)),
  }))
}

export function fixtureTasteTags(seedQuery: string, take = 15): QlooTag[] {
  const scene = pickScene(seedQuery)
  return scene.tasteTags.slice(0, take).map((name, i) => ({
    id: `fixture:tag:${slug(name)}`,
    name,
    weight: rankWeight(i, Math.min(take, scene.tasteTags.length)),
  }))
}

export function fixtureRelated(
  seedQuery: string,
  type: EntityType,
  excludeEntityIds: string[] = [],
  take = 10
): QlooEntity[] {
  const scene = pickScene(seedQuery)
  const excluded = new Set(excludeEntityIds)
  let list: QlooEntity[] = []

  if (type === 'brand') {
    list = scene.brands.map((b, i) => entityFrom(scene.id, b.name, 'brand', b.tags, i, scene.brands.length))
  } else if (type === 'place') {
    list = scene.places.map((p, i) => entityFrom(scene.id, p.name, 'place', p.tags, i, scene.places.length, p.kind))
  } else {
    const entries = scene.crossDomain[type] ?? []
    list = entries.map((e, i) => entityFrom(scene.id, e.name, type, e.tags, i, entries.length))
  }
  return list.filter((e) => !excluded.has(e.id)).slice(0, take)
}

export const FIXTURE_LABEL = 'SAMPLE DATA — not Qloo output'
