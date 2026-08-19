import { readFile } from 'fs/promises'
import { createClient } from '@supabase/supabase-js'

function parseDotEnv(content) {
  const vars = {}
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
    vars[key] = val
  }
  return vars
}

async function main() {
  try {
    const envRaw = await readFile(new URL('../.env', import.meta.url), 'utf8')
    const env = parseDotEnv(envRaw)
    const url = env.VITE_SUPABASE_URL
    const key = env.VITE_SUPABASE_ANON_KEY
    if (!url || !key) {
      console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
      process.exit(2)
    }
    console.log('Creating supabase client to', url)
    const supabase = createClient(url, key, { autoRefreshToken: false })

    // Try a simple select; table may or may not exist, but we'll inspect error vs network
    const { data, error, status } = await supabase.from('expenses').select('id').limit(1)
    console.log('Request status:', status)
    if (error) {
      console.error('Supabase SDK returned error:', error.message)
    } else {
      console.log('Supabase SDK data sample:', data)
    }
  } catch (err) {
    console.error('Unexpected error:', err.message)
    process.exit(1)
  }
}

main()

