import { useCallback, useEffect, useRef, useState } from 'react';
import { catById, catShort, qById } from '../data';
import { discardCurrent, finishCurrent, getState, toggleBookmark, updateCurrent, useStore } from '../store';
import { Icon, confirmDialog, go } from '../ui';

/** 1 回の操作で加算する経過時間の上限（放置時間を数えないため） */
const MAX_TICK = 90_000;

export default function Quiz() {
  const state = useStore();
  const cur = state.current;
  const [sheet, setSheet] = useState(false);
  const [dir, setDir] = useState<1 | -1>(1);
  const lastTick = useRef(Date.now());
  const advanceTimer = useRef<number>(0);

  useEffect(() => {
    if (!cur) go('', true);
  }, [cur]);

  /** 経過時間を加算して current を更新する */
  const commit = useCallback((patch: Parameters<typeof updateCurrent>[0]) => {
    const now = Date.now();
    const c = getState().current;
    if (!c) return;
    updateCurrent({ ...patch, elapsed: c.elapsed + Math.min(now - lastTick.current, MAX_TICK) });
    lastTick.current = now;
  }, []);

  const move = useCallback(
    (to: number) => {
      const c = getState().current;
      if (!c) return;
      const i = Math.max(0, Math.min(c.ids.length - 1, to));
      if (i === c.index) return;
      setDir(i > c.index ? 1 : -1);
      commit({ index: i });
    },
    [commit],
  );

  const answer = useCallback(
    (v: boolean) => {
      const c = getState().current;
      if (!c) return;
      const answers = c.answers.slice();
      answers[c.index] = v;
      commit({ answers });
      window.clearTimeout(advanceTimer.current);
      if (getState().settings.autoAdvance && c.index < c.ids.length - 1) {
        const from = c.index;
        advanceTimer.current = window.setTimeout(() => {
          if (getState().current?.index === from) move(from + 1);
        }, 260);
      }
    },
    [commit, move],
  );

  const submit = useCallback(async () => {
    const c = getState().current;
    if (!c) return;
    const left = c.answers.filter((a) => a === null).length;
    const ok = await confirmDialog(
      left
        ? { title: `未回答が ${left}問 あります`, body: '未回答の問題は不正解として採点されます。答え合わせしますか？', ok: '答え合わせする', cancel: '戻って解く' }
        : { title: '答え合わせしますか？', body: `${c.ids.length}問すべて回答済みです。`, ok: '答え合わせする', cancel: 'もう少し見直す' },
    );
    if (!ok) return;
    commit({});
    const id = finishCurrent();
    if (id) go(`result/${id}`, true);
  }, [commit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || document.querySelector('.dialog')) return;
      const c = getState().current;
      if (!c) return;
      const k = e.key.toLowerCase();
      if (k === 'o' || k === '1' || k === 'z') answer(true);
      else if (k === 'x' || k === '2') answer(false);
      else if (k === 'arrowright' || k === 'l') move(c.index + 1);
      else if (k === 'arrowleft' || k === 'h') move(c.index - 1);
      else if (k === 'enter' && c.answers.every((a) => a !== null)) submit();
      else return;
      e.preventDefault();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [answer, move, submit]);

  useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

  if (!cur) return null;
  const q = qById.get(cur.ids[cur.index])!;
  const cat = catById.get(q.cat)!;
  const ans = cur.answers[cur.index];
  const answered = cur.answers.filter((a) => a !== null).length;
  const allDone = answered === cur.ids.length;
  const isLast = cur.index === cur.ids.length - 1;
  const marked = state.bookmarks.includes(q.id);

  const exit = async () => {
    if (!answered) {
      discardCurrent();
      go('');
      return;
    }
    const ok = await confirmDialog({
      title: '中断しますか？',
      body: '回答は保存されます。ホームの「続きから」で再開できます。',
      ok: '中断する',
      cancel: '続ける',
    });
    if (ok) {
      commit({});
      go('');
    }
  };

  return (
    <div className="page quiz">
      <header className="quiz-head">
        <button className="icon-btn" onClick={exit} aria-label="中断">
          <Icon name="close" />
        </button>
        <div className="quiz-head-mid">
          <div className="quiz-title">{cur.title}</div>
          <div className="quiz-count num">
            <b>{cur.index + 1}</b> / {cur.ids.length}
          </div>
        </div>
        <button className="icon-btn" onClick={() => setSheet(true)} aria-label="問題一覧">
          <Icon name="grid" />
        </button>
      </header>

      <div className="quiz-progress" aria-hidden="true">
        <span className="qp-answered" style={{ width: `${(answered / cur.ids.length) * 100}%` }} />
        <span className="qp-pos" style={{ left: `${((cur.index + 0.5) / cur.ids.length) * 100}%` }} />
      </div>

      <main className="quiz-main">
        <article key={q.id} className={`q-card slide-${dir === 1 ? 'in' : 'back'}`}>
          <div className="q-meta">
            <span className="tag">
              {catShort(cat)}
              <span className="tag-sep" />
              {cat.title}
            </span>
            <span className="q-no num">問{q.n}</span>
            <button className={`star-btn ${marked ? 'on' : ''}`} onClick={() => toggleBookmark(q.id)} aria-pressed={marked} aria-label="ブックマーク">
              <Icon name="star" size={20} fill={marked} />
            </button>
          </div>
          <p className="q-text">{q.q}</p>
          {q.fig && (
            <div className="fig-note">
              <Icon name="image" size={16} />
              図・標識を見て答える問題です（画像は収録されていません）
            </div>
          )}
        </article>

        <div className="answer-row" role="radiogroup" aria-label="回答">
          <button role="radio" aria-checked={ans === true} className={`ans-btn maru ${ans === true ? 'on' : ''}`} onClick={() => answer(true)}>
            <span className="ans-glyph" aria-hidden="true" />
            <span className="sr">正しい（◯）</span>
          </button>
          <button role="radio" aria-checked={ans === false} className={`ans-btn batsu ${ans === false ? 'on' : ''}`} onClick={() => answer(false)}>
            <span className="ans-glyph" aria-hidden="true" />
            <span className="sr">誤り（×）</span>
          </button>
        </div>

        <div className="quiz-nav">
          <button className="btn ghost" onClick={() => move(cur.index - 1)} disabled={cur.index === 0}>
            <Icon name="left" size={18} /> 前へ
          </button>
          {isLast || allDone ? (
            <button className={`btn ${allDone ? 'primary pulse' : 'soft'}`} onClick={submit}>
              答え合わせ <Icon name="check" size={18} />
            </button>
          ) : (
            <button className="btn ghost" onClick={() => move(cur.index + 1)}>
              次へ <Icon name="right" size={18} />
            </button>
          )}
        </div>
        <div className="quiz-sub">
          <span>
            回答 <b className="num">{answered}</b> / {cur.ids.length}
          </span>
          {!allDone && !isLast && (
            <button className="link-btn" onClick={submit}>
              ここで答え合わせ
            </button>
          )}
        </div>
        <div className="kbd-hint">
          キーボード：<kbd>O</kbd> ◯ <kbd>X</kbd> × <kbd>←</kbd>
          <kbd>→</kbd> 移動
        </div>
      </main>

      {sheet && (
        <div className="sheet-backdrop" onClick={() => setSheet(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="問題一覧" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-head">
              <h2>問題一覧</h2>
              <span className="num">
                {answered} / {cur.ids.length} 回答済み
              </span>
            </div>
            <div className="num-grid">
              {cur.ids.map((id, i) => {
                const a = cur.answers[i];
                return (
                  <button
                    key={id}
                    className={`num-cell ${a === true ? 'maru' : a === false ? 'batsu' : ''} ${i === cur.index ? 'cur' : ''}`}
                    onClick={() => {
                      move(i);
                      setSheet(false);
                    }}
                    aria-label={`${i + 1}問目 ${a === null ? '未回答' : a ? '◯' : '×'}`}
                  >
                    <span className="num">{i + 1}</span>
                    {state.bookmarks.includes(id) && <span className="nc-star" />}
                  </button>
                );
              })}
            </div>
            <div className="sheet-foot">
              <button
                className="btn ghost"
                onClick={() => {
                  const i = cur.answers.findIndex((a) => a === null);
                  if (i >= 0) move(i);
                  setSheet(false);
                }}
                disabled={allDone}
              >
                未回答へ移動
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  setSheet(false);
                  submit();
                }}
              >
                答え合わせ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
