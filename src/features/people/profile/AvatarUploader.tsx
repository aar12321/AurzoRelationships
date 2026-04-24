// Wraps PersonAvatar with a click-to-upload overlay. Tapping the avatar
// opens the file picker; a pencil badge is always visible so the
// affordance is discoverable. Upload progress is surfaced via a ring
// overlay; success updates the peopleStore cache; failures toast.
//
// Kept as its own component so PersonAvatar stays read-only everywhere
// else it renders (Dashboard, command palette, lists).

import { useRef, useState } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePeopleStore } from '@/stores/peopleStore';
import { uploadPersonPhoto } from '@/services/avatarService';
import { toast } from '@/stores/toastStore';
import PersonAvatar from '../PersonAvatar';
import type { Person } from '@/types/people';

export default function AvatarUploader({ person }: { person: Person }) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // so picking the same file twice re-fires
    if (!file || !user) return;
    setBusy(true);
    try {
      const updated = await uploadPersonPhoto({
        file,
        personId: person.id,
        ownerId: user.id,
      });
      // Patch the store cache so every consumer (header, cards, palette) sees
      // the new photo without a refetch.
      usePeopleStore.setState((s) => ({
        people: s.people.map((p) => (p.id === updated.id ? updated : p)),
      }));
      toast.success('Photo updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative group shrink-0">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        aria-label={person.photo_url ? 'Change photo' : 'Upload a photo'}
        className="relative block rounded-full focus:outline-none
                   focus-visible:ring-2 focus-visible:ring-terracotta-500
                   focus-visible:ring-offset-2 focus-visible:ring-offset-ivory-50
                   dark:focus-visible:ring-offset-charcoal-900"
      >
        <PersonAvatar name={person.full_name} photoUrl={person.photo_url} size="lg" />

        {/* Pencil badge — always visible so the "you can change this" signal
            is explicit, not a mystery-meat hover affordance. */}
        <span
          aria-hidden
          className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full
                     bg-terracotta-500 text-ivory-50 flex items-center justify-center
                     shadow-warm-dark ring-2 ring-ivory-50 dark:ring-charcoal-900
                     group-hover:scale-110 transition-transform"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round"
               strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </span>

        {busy && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-charcoal-900/40
                       flex items-center justify-center"
          >
            <span className="text-ivory-50 text-xs">Uploading…</span>
          </span>
        )}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={onPick}
        className="sr-only"
      />
    </div>
  );
}
