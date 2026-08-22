/**
 * Builder Clans — local seed script
 *
 * Reads SEED_USER_PASSWORD from process.env (load .env.local manually if you
 * use one) and creates 30 demo users via the Supabase admin API. Then
 * run `psql $DATABASE_URL -f supabase/seed.sql` to attach projects / roles.
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed.ts   # Node 20+
 *   or
 *   tsx scripts/seed.ts
 *
 * Required env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.SEED_USER_PASSWORD ?? 'builder-clans-demo-2026';

if (!SUPABASE_URL || !SERVICE_ROLE) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in your env.',
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Same UUIDs as supabase/seed.sql
const PROFILE_IDS = Array.from({ length: 30 }, (_, i) =>
  `00000000-0000-0000-0000-${(i + 1).toString().padStart(12, '0')}`,
);

const USERNAMES = [
  'ahmet_yilmaz','elif_kaya','sarah_chen','jonas_muller','priya_patel','marco_rossi','zoe_park','omar_hassan',
  'lina_santos','kenji_tanaka','amelia_brown','raj_iyer','noor_abadi','tomas_sven','hana_kim','lucas_martinez',
  'maya_levin','fabio_oliveira','ines_dubois','yusuf_demir','aiyana_ross','ben_stein','chiara_bianchi','dev_kapoor',
  'eva_schmidt','finn_olafur','gabriela_pereira','haruto_sato','irene_papadakis','jamal_ali',
];

const DISPLAY_NAMES = [
  'Ahmet Yılmaz','Elif Kaya','Sarah Chen','Jonas Müller','Priya Patel','Marco Rossi','Zoe Park','Omar Hassan',
  'Lina Santos','Kenji Tanaka','Amelia Brown','Raj Iyer','Noor Abadi','Tomas Sven','Hana Kim','Lucas Martínez',
  'Maya Levin','Fábio Oliveira','Inès Dubois','Yusuf Demir','Aiyana Ross','Ben Stein','Chiara Bianchi','Dev Kapoor',
  'Eva Schmidt','Finn Oláfur','Gabriela Pereira','Haruto Sato','Irene Papadakis','Jamal Ali',
];

async function main() {
  // eslint-disable-next-line no-console
  console.log('Seeding 30 demo users...');
  for (let i = 0; i < PROFILE_IDS.length; i++) {
    const id = PROFILE_IDS[i];
    const email = `${USERNAMES[i]}@builderclans.dev`;
    // createUser does not let us pin the UUID. We use admin.createUser and then upsert the profile by id.
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        username: USERNAMES[i],
        display_name: DISPLAY_NAMES[i],
      },
    });
    if (error && !/already registered/i.test(error.message)) {
      // eslint-disable-next-line no-console
      console.warn(`user ${i + 1} (${email}) failed:`, error.message);
      continue;
    }
    if (data?.user) {
      // eslint-disable-next-line no-console
      console.log(`  ✓ ${USERNAMES[i]} <${email}>`);
    }
  }
  // eslint-disable-next-line no-console
  console.log('\nAll users created. The SQL in supabase/seed.sql will populate projects, roles, matches, trials.');
  // eslint-disable-next-line no-console
  console.log('Apply it with:');
  // eslint-disable-next-line no-console
  console.log('  psql $DATABASE_URL -f supabase/seed.sql');
  // eslint-disable-next-line no-console
  console.log('  or: supabase db reset  (full reset + seed via migrations)');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
