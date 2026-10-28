import { catById, qById, questions, shuffle } from './data';
import { beginQuiz, getState, type Mode } from './store';
import { computeStats } from './stats';
import { confirmDialog, go } from './ui';

/** 途中の問題があれば破棄してよいか確認してから新しく出題する */
export async function startQuiz(mode: Mode, title: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const cur = getState().current;
  if (cur && cur.answers.some((a) => a !== null)) {
    const answered = cur.answers.filter((a) => a !== null).length;
    const ok = await confirmDialog({
      title: '解答途中の問題があります',
      body: `「${cur.title}」の ${answered} / ${cur.ids.length} 問の回答を破棄して、新しく始めますか？`,
      ok: '破棄して始める',
      danger: true,
    });
    if (!ok) return;
  }
  beginQuiz(mode, title, ids);
  go('quiz');
}

/** 「図・標識の問題を出題しない」設定を反映する。keepMock なら模擬テストは本番どおり全問出す */
function filterFig(ids: string[], keepMock = false): string[] {
  if (!getState().settings.excludeFig) return ids;
  return ids.filter((id) => {
    const q = qById.get(id);
    return q && (!q.fig || (keepMock && MOCK.has(catById.get(q.cat)!.group)));
  });
}

const MOCK = new Set(['kari', 'hon']);

export function startRandom(): void {
  const { settings, sessions } = getState();
  let pool = filterFig(questions.map((q) => q.id));
  pool = shuffle(pool);
  if (settings.preferUnseen) {
    const seen = computeStats(sessions).byQuestion;
    pool = [...pool.filter((id) => !seen.has(id)), ...pool.filter((id) => seen.has(id))];
  }
  const ids = pool.slice(0, settings.randomCount);
  startQuiz('random', `ランダム ${ids.length}問`, ids);
}

export function startCategories(catIds: string[], title: string, doShuffle: boolean): void {
  const set = new Set(catIds);
  const ids = filterFig(questions.filter((q) => set.has(q.cat)).map((q) => q.id), true);
  startQuiz('category', title, doShuffle ? shuffle(ids) : ids);
}

export function startWeak(): void {
  const { sessions, settings } = getState();
  const ids = shuffle(filterFig(computeStats(sessions).weakIds)).slice(0, settings.randomCount);
  startQuiz('weak', `苦手な問題 ${ids.length}問`, ids);
}

export function startBookmarks(): void {
  const ids = shuffle(getState().bookmarks.filter((id) => qById.has(id)));
  startQuiz('bookmark', `ブックマーク ${ids.length}問`, ids);
}

export function startRetry(ids: string[], from: string): void {
  startQuiz('retry', `解き直し：${from}`, ids);
}
