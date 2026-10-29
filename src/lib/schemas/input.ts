import { z } from 'zod'
import { normalizePilotCity } from '@/lib/india/cities'

export const creatorTypeSchema = z.enum(['musician', 'podcaster', 'youtuber', 'streamer', 'comic_artist', 'other'])
export const budgetTierSchema = z.enum(['small', 'medium', 'large'])
export const priceTierSchema = z.enum(['budget', 'mid', 'premium'])
export const entityTypeSchema = z.enum(['artist', 'brand', 'place', 'movie', 'tv_show', 'book', 'podcast', 'videogame', 'destination'])
export const productCategorySchema = z.enum(['apparel', 'print', 'objects', 'consumables'])
export const productRoleSchema = z.enum(['core', 'hero', 'limited'])
export const silhouetteSchema = z.enum(['cap', 'top', 'socks', 'tote', 'flat', 'round', 'cassette', 'mug', 'bottle', 'bag', 'can', 'bandana', 'cards'])
export const pilotCitySchema = z.string().trim().transform(normalizePilotCity)
  .pipe(z.enum(['Bengaluru', 'Mumbai', 'Delhi NCR', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata'],
    { error: 'Choose one of our 7 India pilot cities: Bengaluru, Mumbai, Delhi NCR, Pune, Hyderabad, Chennai or Kolkata' }))

export const studioInputSchema = z.object({
  text: z.string().trim().min(2, 'Tell us about your fans, or search an artist').max(1000),
  artist: z.object({ id: z.string().min(1).max(100), name: z.string().min(1).max(120) }).optional(),
  soundsLike: z.array(z.string().trim().min(1).max(80)).max(3).default([]),
  city: pilotCitySchema.default('Bengaluru'),
  creatorType: creatorTypeSchema.default('musician'),
  budget: budgetTierSchema.default('medium'),
})
export type StudioInputZ = z.infer<typeof studioInputSchema>
