import { ensureSeeded } from '@/lib/db/store/seed';
import { getMemoryDb } from '@/lib/db/store/memory';
import { ClanDetail } from './clan-detail';

export async function generateStaticParams() {
  await ensureSeeded();
  return getMemoryDb()
    .clans.all()
    .map((c) => ({ slug: (c as { slug: string }).slug }));
}

export const metadata = { title: 'Clan' };

export default async function ClanPage({ params }: { params: { slug: string } }) {
  await ensureSeeded();
  const clan = getMemoryDb().clans.findOne((c) => (c as { slug: string }).slug === params.slug);
  if (!clan) {
    return (
      <div className="container-narrow py-10 text-center text-sm text-muted-foreground">
        Clan not found.
      </div>
    );
  }
  // The server component pre-renders the static shell and the client
  // component takes over for chat, presence, and join/leave.
  return <ClanDetail slug={params.slug} />;
}
