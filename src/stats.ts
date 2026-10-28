import { useMemo } from 'react';
import { categories, qById, type Question } from './data';
import type { Session } from './store';

export interface QStat {
  attempts: number;
  correct: number;
  last: boolean;
  lastAt: number;
}

export interface CatStat {
  attempts: number;
  correct: number;
  seen: number;
  mastered: number;
}

export interface SessionScore {
  total: number;
  correct: number;
  unanswered: number;
  rate: number;
}

export function isCorrect(q: Question | undefined, ans: boolean | null): boolean {
  return !!q && ans !== null && ans === q.a;
}

export function scoreSession(s: { ids: string[]; answers: (boolean | null)[] }): SessionScore {
  let correct = 0;
  let unanswered = 0;
  s.ids.forEach((id, i) => {
    if (s.answers[i] === null) unanswered++;
    else if (isCorrect(qById.get(id), s.answers[i])) correct++;
  });
  const total = s.ids.length;
  return { total, correct, unanswered, rate: total ? correct / total : 0 };
}

export function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface Stats {
  byQuestion: Map<string, QStat>;
  byCategory: Map<string, CatStat>;
  attempts: number;
  correct: number;
  seen: number;
  mastered: number;
  weakIds: string[];
  /** 日付キー -> 回答数 */
  daily: Map<string, number>;
  streak: number;
  today: number;
}

export function computeStats(sessions: Session[]): Stats {
  const byQuestion = new Map<string, QStat>();
  const daily = new Map<string, number>();
  let attempts = 0;
  let correct = 0;

  const sorted = sessions.slice().sort((a, b) => a.finishedAt - b.finishedAt);
  for (const s of sorted) {
    const day = dayKey(s.finishedAt);
    s.ids.forEach((id, i) => {
      const q = qById.get(id);
      if (!q) return;
      const ok = isCorrect(q, s.answers[i]);
      const st = byQuestion.get(id) ?? { attempts: 0, correct: 0, last: false, lastAt: 0 };
      st.attempts++;
      if (ok) st.correct++;
      st.last = ok;
      st.lastAt = s.finishedAt;
      byQuestion.set(id, st);
      attempts++;
      if (ok) correct++;
    });
    daily.set(day, (daily.get(day) ?? 0) + s.ids.length);
  }

  const byCategory = new Map<string, CatStat>(
    categories.map((c) => [c.id, { attempts: 0, correct: 0, seen: 0, mastered: 0 }]),
  );
  let mastered = 0;
  const weakIds: string[] = [];
  for (const [id, st] of byQuestion) {
    const cs = byCategory.get(qById.get(id)!.cat)!;
    cs.attempts += st.attempts;
    cs.correct += st.correct;
    cs.seen++;
    if (st.last) {
      cs.mastered++;
      mastered++;
    } else weakIds.push(id);
  }

  // 連続学習日数（今日まだ解いていなくても昨日まで続いていればカウント）
  let streak = 0;
  const d = new Date();
  if (!daily.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
  while (daily.has(dayKey(d.getTime()))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }

  return {
    byQuestion,
    byCategory,
    attempts,
    correct,
    seen: byQuestion.size,
    mastered,
    weakIds,
    daily,
    streak,
    today: daily.get(dayKey(Date.now())) ?? 0,
  };
}

export function useStats(sessions: Session[]): Stats {
  return useMemo(() => computeStats(sessions), [sessions]);
}

export function pct(rate: number): string {
  return `${Math.round(rate * 100)}`;
}

export function formatDuration(ms: number): string {
  const sec = Math.round(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m >= 60) return `${Math.floor(m / 60)}時間${m % 60}分`;
  return m ? `${m}分${String(s).padStart(2, '0')}秒` : `${s}秒`;
}

export function formatDate(t: number): string {
  const d = new Date(t);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
