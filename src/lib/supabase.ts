import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

/**
 * Sant först när .env faktiskt är ifylld. Mallvärdena i .env.local ser ut som
 * en riktig adress för createClient, så varje anrop går iväg och dör på DNS
 * en halv sekund senare — spelaren ser en snurra som aldrig slutar. Bättre att
 * skärmarna får veta i förväg att det inte finns någon databas att fråga.
 */
export const harSupabase =
  !!url && !!key &&
  /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url.trim()) &&
  !/ditt|din-|example|placeholder/i.test(`${url} ${key}`)

export const supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder')
