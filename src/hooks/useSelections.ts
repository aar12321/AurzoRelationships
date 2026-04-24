// Two-hook set that matches the spec's "toggle pattern … same action saves
// and unsaves … show correct saved state on load". useSelection is the
// per-item hook (save button); useCollection is the list-view hook.

import { useCallback, useEffect, useState } from 'react';
import {
  listCollection,
  saveSelection,
  unsaveSelection,
  type UserSelection,
} from '@/services/selectionsService';

type ToggleOpts = {
  collection: string;
  itemId: string;
  itemType?: string;
  snapshot?: Record<string, unknown>;
};

export function useSelection(opts: ToggleOpts): {
  saved: boolean;
  loading: boolean;
  toggle: () => Promise<void>;
} {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const items = await listCollection(opts.collection);
      if (!alive) return;
      setSaved(items.some((it) => it.item_id === opts.itemId));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [opts.collection, opts.itemId]);

  const toggle = useCallback(async () => {
    const next = !saved;
    setSaved(next); // optimistic
    try {
      if (next) {
        await saveSelection({
          collection: opts.collection,
          itemId: opts.itemId,
          itemType: opts.itemType,
          snapshot: opts.snapshot,
        });
      } else {
        await unsaveSelection(opts.collection, opts.itemId);
      }
    } catch (err) {
      setSaved(!next); // rollback
      throw err;
    }
  }, [saved, opts.collection, opts.itemId, opts.itemType, opts.snapshot]);

  return { saved, loading, toggle };
}

export function useCollection(collection: string): {
  items: UserSelection[];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [items, setItems] = useState<UserSelection[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setItems(await listCollection(collection)); }
    finally { setLoading(false); }
  }, [collection]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { items, loading, refresh };
}
