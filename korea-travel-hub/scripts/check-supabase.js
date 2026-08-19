import { readFile } from 'fs/promises'

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
    if (!url) {
      console.error('No VITE_SUPABASE_URL found in .env')
      process.exit(2)
    }
    console.log('Probing Supabase URL:', url)
    const res = await fetch(url, { method: 'GET' })
    console.log('HTTP status:', res.status)
    const txt = await res.text()
    console.log('Body snippet:', txt.slice(0, 200).replace(/\n/g, ' '))
    if (res.ok) console.log('Supabase project base URL is reachable (HTTP 200-299).')
    else console.warn('Supabase base URL returned non-OK status; the API could still be reachable under /rest or via client SDK.')
  } catch (err) {
    console.error('Error probing Supabase:', err.message)
    process.exit(1)
  }
}

main()

