import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { encodeHealthRecord, decodeHealthRecord } from '../codec';
import type { HealthRecord, Visit } from '../types';

const HASH_PREFIX = '#r=';

function subscribe(callback: () => void): () => void {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

function getHashSnapshot(): string {
  return window.location.hash;
}

async function loadFromHash(hash: string): Promise<HealthRecord | null> {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  const encoded = hash.slice(HASH_PREFIX.length);
  if (!encoded) return null;
  return decodeHealthRecord(encoded);
}

async function saveToHash(record: HealthRecord): Promise<void> {
  const encoded = await encodeHealthRecord(record);
  history.replaceState(null, '', HASH_PREFIX + encoded);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export interface UseHealthRecordReturn {
  record: HealthRecord | null;
  loading: boolean;
  error: string | null;
  addVisit: (visit: Visit) => Promise<void>;
  updateVisit: (index: number, visit: Visit) => Promise<void>;
  deleteVisit: (index: number) => Promise<void>;
}

export function useHealthRecord(): UseHealthRecordReturn {
  const hash = useSyncExternalStore(subscribe, getHashSnapshot);
  const [record, setRecord] = useState<HealthRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedHashRef = useRef<string | null>(null);

  useEffect(() => {
    if (loadedHashRef.current === hash) return;
    loadedHashRef.current = hash;

    if (!hash.startsWith(HASH_PREFIX) || hash === HASH_PREFIX) {
      setRecord(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    loadFromHash(hash)
      .then((r) => { setRecord(r); setLoading(false); })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to decode URL');
        setRecord(null);
        setLoading(false);
      });
  }, [hash]);

  const addVisit = useCallback(async (visit: Visit) => {
    const current = record ?? { version: 1 as const, visits: [] };
    await saveToHash({ ...current, visits: [...current.visits, visit] });
  }, [record]);

  const updateVisit = useCallback(async (index: number, visit: Visit) => {
    if (!record) return;
    const visits = [...record.visits];
    visits[index] = visit;
    await saveToHash({ ...record, visits });
  }, [record]);

  const deleteVisit = useCallback(async (index: number) => {
    if (!record) return;
    const visits = record.visits.filter((_, i) => i !== index);
    if (visits.length === 0) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      await saveToHash({ ...record, visits });
    }
  }, [record]);

  return { record, loading, error, addVisit, updateVisit, deleteVisit };
}
