import raw from './data/questions.json';

export interface Question {
  id: string;
  cat: string;
  n: number;
  q: string;
  /** true = ◯, false = × */
  a: boolean;
  /** 解説 */
  e?: string;
  /** 図・標識の画像が前提の問題 */
  fig?: boolean;
}

export type GroupId = 's1' | 's2' | 'kari' | 'hon';

export interface Category {
  id: string;
  group: GroupId;
  no: number | null;
  title: string;
  count: number;
}

export const categories = raw.categories as Category[];
export const questions = raw.questions as Question[];
export const qById = new Map(questions.map((q) => [q.id, q]));
export const catById = new Map(categories.map((c) => [c.id, c]));

export const GROUPS: { id: GroupId; label: string; sub: string }[] = [
  { id: 's1', label: '第1段階', sub: '仮免許までの学科' },
  { id: 's2', label: '第2段階', sub: '本免許までの学科' },
  { id: 'kari', label: '仮免 模擬テスト', sub: '50問・90%以上で合格' },
  { id: 'hon', label: '本免 模擬テスト', sub: '90問・90%以上で合格' },
];

export const PASS_RATE = 0.9;

export function catShort(c: Category): string {
  if (c.group === 's1') return `1段階・${c.no}`;
  if (c.group === 's2') return `2段階・${c.no}`;
  return '模擬';
}

/** 出題タイトル用のフルネーム */
export function catTitle(c: Category): string {
  return c.no === null ? c.title : `${catShort(c)} ${c.title}`;
}

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
