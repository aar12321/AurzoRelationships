// Upload a person's photo to the shared Aurzo `user-avatars` storage bucket,
// then persist the resulting public URL on the people row. Returns the URL
// on success; throws on failure so callers can show a toast instead of
// silently dropping the user's intent (unlike memory photos, which fall back
// to text-only — an avatar upload is always deliberate).
//
// Path convention: `{ownerId}/{personId}-{timestamp}.ext`. Scoping by owner
// keeps storage policies simple and makes per-user cleanup tractable later.

import { supabase } from './supabase';
import { updatePerson } from './peopleService';
import type { Person } from '@/types/people';

const BUCKET = 'user-avatars';
const MAX_BYTES = 5 * 1024 * 1024;

export async function uploadPersonPhoto(args: {
  file: File;
  personId: string;
  ownerId: string;
}): Promise<Person> {
  const { file, personId, ownerId } = args;
  if (file.size > MAX_BYTES) {
    throw new Error('Photo too large — please pick something under 5 MB.');
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('That file doesn\'t look like an image.');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${ownerId}/${personId}-${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadErr) throw new Error(uploadErr.message || 'Upload failed.');

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = data.publicUrl;
  if (!publicUrl) throw new Error('Uploaded, but the public URL came back empty.');

  // Persist to the row so every store / page that reads photo_url gets the
  // new asset on the next render.
  return updatePerson(personId, { photo_url: publicUrl });
}
