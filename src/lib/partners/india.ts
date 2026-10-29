import type { CollabSuggestion, TasteProfile } from '@/types'
import type { PilotCity } from '@/lib/india/cities'
import { profileTagWeights } from '@/lib/score/tag-map'
import catalogJson from '@/data/catalog.json'
import type { CatalogItem } from '@/types'

interface Venue {
  id: string
  name: string
  city: PilotCity
  area: string
  tags: string[]
  anchorTags: string[]
  sourceUrl: string
  idea: string
}

// Official venue pages establish location and format, not interest or willingness to partner.
const VENUES: Venue[] = [
  { id: 'blr-champaca', name: 'Champaca Bookstore', city: 'Bengaluru', area: 'bookshop · Vasanth Nagar', tags: ['books', 'zines', 'art-print', 'coffee'], anchorTags: ['books', 'zines'], sourceUrl: 'https://champaca.in/pages/contact-us', idea: 'Pitch a small illustrated print or reading-event drop.' },
  { id: 'blr-atta-galatta', name: 'Atta Galatta', city: 'Bengaluru', area: 'bookshop & events · Indiranagar', tags: ['books', 'comics', 'zines', 'art-print'], anchorTags: ['books', 'comics', 'zines'], sourceUrl: 'https://attagalatta.com/contact.php', idea: 'Pitch a zine launch or artist conversation with a limited print.' },
  { id: 'blr-subko', name: 'Subko Craftery', city: 'Bengaluru', area: 'coffee & workshops · Koramangala', tags: ['coffee', 'photography', 'art-print', 'handmade'], anchorTags: ['coffee', 'photography', 'handmade'], sourceUrl: 'https://www.subko.coffee/pages/locations', idea: 'Pitch a coffee-side print pop-up or creative workshop.' },
  { id: 'blr-db-studiolab', name: 'db studioLab', city: 'Bengaluru', area: 'electronic music venue · Brigade Road', tags: ['electronic', 'indie', 'nightlife'], anchorTags: ['electronic', 'indie'], sourceUrl: 'https://www.dbnites.com/', idea: 'Pitch a DJ-night poster or small merch table.' },
  { id: 'blr-ranga-shankara', name: 'Ranga Shankara', city: 'Bengaluru', area: 'theatre · JP Nagar', tags: ['theatre', 'indie', 'art-print', 'festival'], anchorTags: ['theatre', 'indie'], sourceUrl: 'https://rangashankara.org/', idea: 'Pitch a performance-night poster or limited merch table.' },
  { id: 'bom-kitab-khana', name: 'Kitab Khana', city: 'Mumbai', area: 'bookshop · Fort', tags: ['books', 'comics', 'zines', 'art-print'], anchorTags: ['books', 'comics', 'zines'], sourceUrl: 'https://www.kitabkhana.in/en/', idea: 'Pitch a bookish zine or illustrated print launch.' },
  { id: 'bom-subko', name: 'Subko', city: 'Mumbai', area: 'coffee · Bandra', tags: ['coffee', 'photography', 'art-print', 'handmade'], anchorTags: ['coffee', 'photography', 'handmade'], sourceUrl: 'https://www.subko.coffee/pages/locations', idea: 'Pitch a coffee-side print pop-up or small creative drop.' },
  { id: 'bom-habitat', name: 'The Habitat', city: 'Mumbai', area: 'live venue · Khar', tags: ['indie', 'hiphop', 'electronic', 'festival'], anchorTags: ['indie', 'hiphop', 'electronic'], sourceUrl: 'https://indiehabitat.in/', idea: 'Pitch a gig-night poster or limited merch table.' },
  { id: 'bom-prithvi', name: 'Prithvi Theatre', city: 'Mumbai', area: 'theatre · Juhu', tags: ['theatre', 'indie', 'art-print', 'festival'], anchorTags: ['theatre', 'indie'], sourceUrl: 'https://www.prithvitheatre.org/prithvi-experience', idea: 'Pitch a performance-night print or artist talk.' },
  { id: 'del-kunzum', name: 'Kunzum Books', city: 'Delhi NCR', area: 'bookshop & events · Greater Kailash II', tags: ['books', 'zines', 'art-print', 'coffee'], anchorTags: ['books', 'zines'], sourceUrl: 'https://kunzum.com/', idea: 'Pitch an illustrated print or reading-event drop.' },
  { id: 'del-piano-man', name: 'The Piano Man', city: 'Delhi NCR', area: 'live jazz venue · Safdarjung', tags: ['indie', 'electronic', 'nightlife', 'festival'], anchorTags: ['indie', 'electronic'], sourceUrl: 'https://www.thepianoman.in/', idea: 'Pitch a gig-night poster or small merch table.' },
  { id: 'pne-pagdandi', name: 'Pagdandi Books Chai Cafe', city: 'Pune', area: 'bookshop & café · Baner', tags: ['books', 'zines', 'coffee', 'art-print'], anchorTags: ['books', 'zines'], sourceUrl: 'https://pagdandi.org/', idea: 'Pitch a bookish zine launch or chai-side print pop-up.' },
  { id: 'pne-goethe', name: 'Goethe-Institut / Max Mueller Bhavan Pune', city: 'Pune', area: 'cultural institute · Boat Club Road', tags: ['art-print', 'theatre', 'indie', 'festival'], anchorTags: ['art-print', 'theatre'], sourceUrl: 'https://www.goethe.de/ins/in/en/spr/kur.html', idea: 'Pitch an exhibition-side print drop or artist talk.' },
  { id: 'hyd-lamakaan', name: 'Lamakaan', city: 'Hyderabad', area: 'open cultural space · Banjara Hills', tags: ['theatre', 'books', 'indie', 'festival', 'art-print'], anchorTags: ['theatre', 'indie'], sourceUrl: 'https://digital.lamakaan.com/', idea: 'Pitch a performance-night print or small launch event.' },
  { id: 'hyd-roastery', name: 'Roastery Coffee House', city: 'Hyderabad', area: 'coffee · Film Nagar, Jubilee Hills', tags: ['coffee', 'photography', 'art-print', 'handmade'], anchorTags: ['coffee', 'photography'], sourceUrl: 'https://roasterycoffee.co.in/cafe-locations-2', idea: 'Pitch a coffee-side print pop-up or creative drop.' },
  { id: 'che-higginbothams', name: 'Higginbothams', city: 'Chennai', area: 'bookshop since 1844 · Anna Salai', tags: ['books', 'comics', 'zines', 'art-print'], anchorTags: ['books', 'zines'], sourceUrl: 'https://www.higginbothams.co.in/', idea: 'Pitch a bookish zine or illustrated print launch.' },
  { id: 'che-music-academy', name: 'The Music Academy Madras', city: 'Chennai', area: 'concert hall · T.T.K. Road', tags: ['folk', 'theatre', 'festival', 'art-print'], anchorTags: ['folk', 'theatre'], sourceUrl: 'https://musicacademymadras.in/', idea: 'Pitch a season-time print or limited programme keepsake.' },
  { id: 'kol-starmark', name: 'Starmark', city: 'Kolkata', area: 'bookshop & leisure retail · Quest Mall', tags: ['books', 'comics', 'zines', 'art-print'], anchorTags: ['books', 'comics'], sourceUrl: 'https://www.starmark.in/', idea: 'Pitch a bookish zine or illustrated print launch.' },
  { id: 'kol-kcc', name: 'Kolkata Centre for Creativity', city: 'Kolkata', area: 'multidisciplinary arts centre · Anandapur', tags: ['art-print', 'handmade', 'theatre', 'festival'], anchorTags: ['art-print', 'handmade'], sourceUrl: 'https://www.kolkatacentreforcreativity.org/', idea: 'Pitch an exhibition-side print or craft collab during AMI Arts Festival.' },
]

const PRODUCTS = new Map((catalogJson as CatalogItem[]).map((item) => [item.id, item]))

export function indiaVenueIdeas(city: PilotCity, profile: TasteProfile, productIds: string[]): CollabSuggestion[] {
  const weights = profileTagWeights(profile)
  return VENUES.filter((venue) => venue.city === city)
    .map((venue) => ({ venue, matched: venue.tags.filter((tag) => weights.has(tag)), score: venue.tags.reduce((sum, tag) => sum + (weights.get(tag) ?? 0), 0) }))
    .filter(({ venue, matched }) => matched.some((tag) => venue.anchorTags.includes(tag)))
    .sort((a, b) => b.score - a.score || a.venue.name.localeCompare(b.venue.name))
    .slice(0, 4)
    .map(({ venue, matched }) => ({
      id: venue.id,
      name: venue.name,
      type: 'place',
      area: venue.area,
      tags: matched.slice(0, 2),
      partnerIdea: venue.idea,
      linkedProductIds: productIds.filter((id) => PRODUCTS.get(id)?.tags.some((tag) => venue.tags.includes(tag))).slice(0, 2),
      sourceUrl: venue.sourceUrl,
    }))
}
