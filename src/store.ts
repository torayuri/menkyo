import { useSyncExternalStore } from 'react';

export type Mode = 'random' | 'category' | 'weak' | 'retry' | 'bookmark';

export interface Session {
  id: string;
  mode: Mode;
  title: string;
  startedAt: number;
  finishedAt: number;
  /** 実際に解いていた時間（ミリ秒） */
  elapsed: number;
  ids: string[];
  /** true = ◯, false = ×, null = 未回答 */
  answers: (boolean | null)[];
}

export interface Current {
  mode: Mode;
  title: string;
  startedAt: number;
  elapsed: number;
  ids: string[];
  answers: (boolean | null)[];
  index: number;
}

export interface Settings {
  randomCount: number;
  excludeFig: boolean;
  preferUnseen: boolean;
  autoAdvance: boolean;
}

export interface State {
  v: 1;
  sessions: Session[];
  current: Current | null;
  bookmarks: string[];
  settings: Settings;
}

const KEY = 'menkyo.v1';

const DEFAULT_SETTINGS: Settings = {
  randomCount: 100,
  excludeFig: false,
  preferUnseen: false,
  autoAdvance: true,
};

function initial(): State {
  return { v: 1, sessions: [], current: null, bookmarks: [], settings: { ...DEFAULT_SETTINGS } };
}

export function normalize(input: unknown): State | null {
  if (!input || typeof input !== 'object') return null;
  const s = input as Partial<State>;
  if (!Array.isArray(s.sessions)) return null;
  return {
    v: 1,
    sessions: s.sessions.filter((x) => x && Array.isArray(x.ids) && Array.isArray(x.answers)),
    current: s.current && Array.isArray(s.current.ids) ? s.current : null,
    bookmarks: Array.isArray(s.bookmarks) ? s.bookmarks : [],
    settings: { ...DEFAULT_SETTINGS, ...(s.settings ?? {}) },
  };
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw)) ?? initial();
  } catch {
    /* 保存領域が使えない環境ではメモリ上だけで動かす */
  }
  return initial();
}

let state: State = load();
const listeners = new Set<() => void>();

export function getState(): State {
  return state;
}

export function setState(update: (s: State) => State): void {
  state = update(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* noop */
  }
  listeners.forEach((l) => l());
}

export function replaceState(next: State): void {
  setState(() => next);
}

export function resetState(): void {
  setState((s) => ({ ...initial(), settings: s.settings }));
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore(): State {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function updateSettings(patch: Partial<Settings>): void {
  setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
}

export function toggleBookmark(id: string): void {
  setState((s) => ({
    ...s,
    bookmarks: s.bookmarks.includes(id) ? s.bookmarks.filter((b) => b !== id) : [...s.bookmarks, id],
  }));
}

export function beginQuiz(mode: Mode, title: string, ids: string[]): void {
  setState((s) => ({
    ...s,
    current: { mode, title, ids, answers: ids.map(() => null), index: 0, startedAt: Date.now(), elapsed: 0 },
  }));
}

export function updateCurrent(patch: Partial<Current>): void {
  setState((s) => (s.current ? { ...s, current: { ...s.current, ...patch } } : s));
}

export function discardCurrent(): void {
  setState((s) => ({ ...s, current: null }));
}

/** 現在の問題を採点して履歴に保存し、セッション ID を返す */
export function finishCurrent(): string | null {
  const c = state.current;
  if (!c) return null;
  const session: Session = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    mode: c.mode,
    title: c.title,
    startedAt: c.startedAt,
    finishedAt: Date.now(),
    elapsed: c.elapsed,
    ids: c.ids,
    answers: c.answers,
  };
  setState((s) => ({ ...s, current: null, sessions: [...s.sessions, session] }));
  return session.id;
}

export function deleteSession(id: string): void {
  setState((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id) }));
}
