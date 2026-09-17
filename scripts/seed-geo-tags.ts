import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// Geo-tags seed script
// Usage: npx tsx scripts/seed-geo-tags.ts <ACCOUNT_ID>
//
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env
// and inserts missing province/state tags into the `tags` table for the given account.
// ---------------------------------------------------------------------------

// ── Data ──────────────────────────────────────────────────────────────────

const ARGENTINA_COLOR = '#22c55e' // green
const MEXICO_COLOR = '#ef4444'    // red
const ESPANA_COLOR = '#eab308'    // yellow

const ARGENTINA = [
  'Buenos Aires',
  'CABA',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán',
]

const MEXICO = [
  'Aguascalientes',
  'Baja California',
  'Baja California Sur',
  'Campeche',
  'Chiapas',
  'Chihuahua',
  'Ciudad de México',
  'Coahuila',
  'Colima',
  'Durango',
  'Estado de México',
  'Guanajuato',
  'Guerrero',
  'Hidalgo',
  'Jalisco',
  'Michoacán',
  'Morelos',
  'Nayarit',
  'Nuevo León',
  'Oaxaca',
  'Puebla',
  'Querétaro',
  'Quintana Roo',
  'San Luis Potosí',
  'Sinaloa',
  'Sonora',
  'Tabasco',
  'Tamaulipas',
  'Tlaxcala',
  'Veracruz',
  'Yucatán',
  'Zacatecas',
]

const ESPANA = [
  'Andalucía',
  'Aragón',
  'Asturias',
  'Islas Baleares',
  'Canarias',
  'Cantabria',
  'Castilla-La Mancha',
  'Castilla y León',
  'Cataluña',
  'Extremadura',
  'Galicia',
  'La Rioja',
  'Comunidad de Madrid',
  'Región de Murcia',
  'Navarra',
  'País Vasco',
  'Comunidad Valenciana',
  'Ceuta',
  'Melilla',
]

// ── Helpers ───────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env')
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    const val = line.slice(eq + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
}

function buildTags(
  names: string[],
  color: string,
  accountId: string,
  userId: string
) {
  return names.map((name) => ({
    user_id: userId,
    name,
    color,
    account_id: accountId,
  }))
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  loadEnv()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const accountId = process.argv[2]

  if (!supabaseUrl || !serviceKey) {
    console.error(
      'Missing env vars. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env'
    )
    process.exit(1)
  }

  if (!accountId) {
    console.error('Usage: npx tsx scripts/seed-geo-tags.ts <ACCOUNT_ID>')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  // 1. Verify account exists
  const { data: account, error: acctErr } = await supabase
    .from('accounts')
    .select('id, owner_user_id')
    .eq('id', accountId)
    .single()

  if (acctErr || !account) {
    console.error(`Account ${accountId} not found:`, acctErr?.message)
    process.exit(1)
  }

  // 2. Get a valid user_id for this account (owner or any admin)
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('account_id', accountId)
    .in('account_role', ['owner', 'admin'])
    .limit(1)
    .single()

  const userId = profile?.user_id || account.owner_user_id

  // 3. Fetch existing tag names for this account
  const { data: existingTags } = await supabase
    .from('tags')
    .select('name')
    .eq('account_id', accountId)

  const existingNames = new Set(
    (existingTags ?? []).map((t: { name: string }) => t.name)
  )

  console.log(`Existing tags for account: ${existingNames.size}`)

  // 4. Build all geo-tags and filter out ones that already exist
  const allTags = [
    ...buildTags(ARGENTINA, ARGENTINA_COLOR, accountId, userId),
    ...buildTags(MEXICO, MEXICO_COLOR, accountId, userId),
    ...buildTags(ESPANA, ESPANA_COLOR, accountId, userId),
  ]

  const tagsToInsert = allTags.filter((t) => !existingNames.has(t.name))

  if (tagsToInsert.length === 0) {
    console.log('All geo-tags already present. Nothing to insert.')
    return
  }

  console.log(
    `Inserting ${tagsToInsert.length} new geo-tags (${existingNames.size} already existed)...`
  )

  // 5. Insert in batches of 50
  const BATCH = 50
  let inserted = 0

  for (let i = 0; i < tagsToInsert.length; i += BATCH) {
    const batch = tagsToInsert.slice(i, i + BATCH)
    const { error } = await supabase.from('tags').insert(batch)

    if (error) {
      console.error(`Batch ${i / BATCH + 1} failed:`, error.message)
      process.exit(1)
    }

    inserted += batch.length
    console.log(`  ✓ ${inserted}/${tagsToInsert.length}`)
  }

  // 6. Summary
  const { count } = await supabase
    .from('tags')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountId)

  console.log(`\nDone! Total tags in account: ${count}`)
  console.log('Countries seeded: Argentina, México, España')
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
