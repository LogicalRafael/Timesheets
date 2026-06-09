import { createClient } from '@supabase/supabase-js'

/**
 * Server-side only. Bypasses RLS entirely.
 * Never import this from a client component or expose it to the browser.
 * Always verify the caller's role in application code before using this client.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
        'Add SUPABASE_SERVICE_ROLE_KEY to your .env.local (never prefix it with NEXT_PUBLIC_).'
    )
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
