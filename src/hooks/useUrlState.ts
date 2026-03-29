import { useCallback, useSyncExternalStore } from 'react';
import type { UrlState, AgeBracket, BiologicalSex } from '../types';

// ─── Defaults ─────────────────────────────────────────────────────────────

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const DEFAULT_STATE: UrlState = {
  date: currentYearMonth(),
  sex: 'male',
  ageBracket: '31-40',
  nonces: {},
  lens: 'raw',
};

// ─── Serialisation ────────────────────────────────────────────────────────

function parseFragment(fragment: string): UrlState {
  const params = new URLSearchParams(fragment.replace(/^#/, ''));
  const state: UrlState = { ...DEFAULT_STATE };

  const date = params.get('date');
  if (date && /^\d{4}-\d{2}$/.test(date)) state.date = date;

  const sex = params.get('sex');
  if (sex === 'male' || sex === 'female') state.sex = sex as BiologicalSex;

  const age = params.get('age');
  const validAges: AgeBracket[] = ['20-30', '31-40', '41-50', '51-60', '61+'];
  if (age && validAges.includes(age as AgeBracket)) state.ageBracket = age as AgeBracket;

  const lens = params.get('lens');
  if (lens === 'raw' || lens === 'zscore') state.lens = lens;

  const noncesRaw = params.get('nonces');
  if (noncesRaw) {
    const nonces: Record<string, string> = {};
    for (const pair of noncesRaw.split(',')) {
      const idx = pair.indexOf(':');
      if (idx > 0) {
        const key = pair.slice(0, idx);
        const val = pair.slice(idx + 1);
        if (key && val) nonces[key] = val;
      }
    }
    state.nonces = nonces;
  }

  const active = params.get('active');
  if (active) state.activeMarker = active;

  return state;
}

function serializeFragment(state: UrlState): string {
  const params = new URLSearchParams();
  params.set('date', state.date);
  params.set('sex', state.sex);
  params.set('age', state.ageBracket);
  params.set('lens', state.lens);

  if (Object.keys(state.nonces).length > 0) {
    params.set(
      'nonces',
      Object.entries(state.nonces)
        .map(([k, v]) => `${k}:${v}`)
        .join(','),
    );
  }

  if (state.activeMarker) {
    params.set('active', state.activeMarker);
  }

  return '#' + params.toString();
}

// ─── External store (hash-change based) ───────────────────────────────────

function subscribe(callback: () => void): () => void {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

function getSnapshot(): string {
  return window.location.hash;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useUrlState(): [UrlState, (patch: Partial<UrlState>) => void] {
  const hash = useSyncExternalStore(subscribe, getSnapshot);
  const state = parseFragment(hash);

  const update = useCallback((patch: Partial<UrlState>) => {
    const current = parseFragment(window.location.hash);
    const next = { ...current, ...patch };
    // Merge nonces rather than replace
    if (patch.nonces) {
      next.nonces = { ...current.nonces, ...patch.nonces };
    }
    history.replaceState(null, '', serializeFragment(next));
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }, []);

  return [state, update];
}
