import { useMemo, useState } from 'react';
import { PASS_RATE, catById, catShort, qById, type Question } from '../data';
import { startRetry } from '../start';
import { deleteSession, toggleBookmark, useStore } from '../store';
import { formatDate, formatDuration, isCorrect, pct, scoreSession } from '../stats';
import { Icon, Ring, TopBar, confirmDialog, go } from '../ui';

type Filter = 'wrong' | 'all' | 'right';

const CAT_PREVIEW = 6;

export default function Result({ id }: { id: string }) {
  const state = useStore();
  const session = state.sessions.find((s) => s.id === id);
  const [filter, setFilter] = useState<Filter>('wrong');
  const [allCats, setAllCats] = useState(false);

  const rows = useMemo(
    () =>
      session
        ? session.ids
            .map((qid, i) => ({ i, q: qById.get(qid), ans: session.answers[i] }))
            .filter((r): r is { i: number; q: Question; ans: boolean | null } => !!r.q)
            .map((r) => ({ ...r, ok: isCorrect(r.q, r.ans) }))
        : [],
    [session],
  );

  const byCat = useMemo(() => {
    const m = new Map<string, { n: number; c: number }>();
    for (const r of rows) {
      const v = m.get(r.q.cat) ?? { n: 0, c: 0 };
      v.n++;
      if (r.ok) v.c++;
      m.set(r.q.cat, v);
    }
    return [...m.entries()].map(([cat, v]) => ({ cat: catById.get(cat)!, ...v, rate: v.c / v.n })).sort((a, b) => a.rate - b.rate);
  }, [rows]);

  if (!session) {
    return (
      <div className="page">
        <TopBar title="結果" onBack={() => go('')} />
        <div className="empty">この記録は見つかりませんでした。</div>
      </div>
    );
  }

  const score = scoreSession(session);
  const wrong = rows.filter((r) => !r.ok);
  const passed = score.rate >= PASS_RATE;
  const need = Math.max(0, Math.ceil(PASS_RATE * score.total) - score.correct);
  const shown = rows.filter((r) => (filter === 'all' ? true : filter === 'wrong' ? !r.ok : r.ok));

  return (
    <div className="page result">
      <TopBar
        title="結果"
        onBack={() => (history.length > 1 ? history.back() : go(''))}
        right={
          <button
            className="icon-btn"
            aria-label="この記録を削除"
            onClick={async () => {
              if (await confirmDialog({ title: 'この記録を削除しますか？', body: '正答率などの集計からも除外されます。', ok: '削除する', danger: true })) {
                deleteSession(session.id);
                go('history', true);
              }
            }}
          >
            <Icon name="trash" />
          </button>
        }
      />

      <section className={`score-hero ${passed ? 'pass' : ''}`}>
        <div className="score-title">{session.title}</div>
        <div className="score-date">{formatDate(session.finishedAt)}</div>
        <Ring rate={score.rate} pass={PASS_RATE} size={188} stroke={16}>
          <div className="ring-rate num">
            {pct(score.rate)}
            <small>%</small>
          </div>
          <div className="ring-sub num">
            {score.correct} / {score.total}問
          </div>
        </Ring>
        <div className={`verdict ${passed ? 'ok' : ''}`}>
          {passed ? (
            <>
              <Icon name="check" size={18} /> 合格ライン（90%）クリア！
            </>
          ) : (
            <>合格ライン（90%）まであと {need}問</>
          )}
        </div>
        <div className="score-tiles">
          <div className="tile">
            <span className="tile-label">正解</span>
            <span className="tile-value num good">{score.correct}</span>
          </div>
          <div className="tile">
            <span className="tile-label">不正解</span>
            <span className="tile-value num bad">{score.total - score.correct - score.unanswered}</span>
          </div>
          <div className="tile">
            <span className="tile-label">未回答</span>
            <span className="tile-value num">{score.unanswered}</span>
          </div>
          <div className="tile">
            <span className="tile-label">時間</span>
            <span className="tile-value small">{formatDuration(session.elapsed)}</span>
          </div>
        </div>
        <div className="score-actions">
          {wrong.length > 0 && (
            <button className="btn primary" onClick={() => startRetry(wrong.map((r) => r.q.id), session.title.replace(/^解き直し：/, ''))}>
              <Icon name="repeat" size={18} /> 間違えた{wrong.length}問を解き直す
            </button>
          )}
          <button className="btn ghost" onClick={() => go('')}>
            <Icon name="home" size={18} /> ホーム
          </button>
        </div>
      </section>

      {byCat.length > 1 && (
        <section className="section">
          <h2 className="section-title">項目別の正答率{byCat.length > CAT_PREVIEW && !allCats ? '（低い順）' : ''}</h2>
          <div className="card bars">
            {(allCats ? byCat : byCat.slice(0, CAT_PREVIEW)).map((b) => (
              <div key={b.cat.id} className="hbar" title={`${b.cat.title}：${b.c}/${b.n}問正解`}>
                <div className="hbar-label">
                  <span className="hbar-cat">{catShort(b.cat)}</span>
                  {b.cat.title}
                </div>
                <div className="hbar-track">
                  <span className={`hbar-fill ${b.rate >= PASS_RATE ? 'good' : b.rate < 0.7 ? 'bad' : ''}`} style={{ width: `${Math.max(b.rate * 100, 1.5)}%` }} />
                  <span className="hbar-pass" style={{ left: `${PASS_RATE * 100}%` }} />
                </div>
                <div className="hbar-value num">
                  {b.c}/{b.n}
                </div>
              </div>
            ))}
            {byCat.length > CAT_PREVIEW && (
              <button className="link-btn" onClick={() => setAllCats((v) => !v)}>
                {allCats ? '苦手な項目だけ表示' : `すべての項目を表示（${byCat.length}）`}
              </button>
            )}
          </div>
        </section>
      )}

      <section className="section">
        <div className="review-head">
          <h2 className="section-title">答え合わせ</h2>
          <div className="tabs" role="tablist">
            {(
              [
                ['wrong', `不正解 ${wrong.length}`],
                ['right', `正解 ${rows.length - wrong.length}`],
                ['all', `すべて ${rows.length}`],
              ] as [Filter, string][]
            ).map(([k, label]) => (
              <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {shown.length === 0 ? (
          <div className="empty">{filter === 'wrong' ? '全問正解です。おみごと！' : '該当する問題はありません。'}</div>
        ) : (
          <ol className="review-list">
            {shown.map((r) => (
              <ReviewItem key={r.i} index={r.i} q={r.q} ans={r.ans} ok={r.ok} marked={state.bookmarks.includes(r.q.id)} />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

export function ReviewItem({ index, q, ans, ok, marked, badge }: { index?: number; q: Question; ans?: boolean | null; ok?: boolean; marked: boolean; badge?: string }) {
  const [open, setOpen] = useState(false);
  const cat = catById.get(q.cat)!;
  const graded = ok !== undefined;
  // 間違えた問題は解説を常に表示、正解した問題はタップで表示
  const showNote = q.e && (!graded || !ok || open);
  return (
    <li className={`review ${graded ? (ok ? 'ok' : 'ng') : ''}`}>
      <div className="review-top">
        {graded && (
          <span className={`judge ${ok ? 'ok' : 'ng'}`} aria-label={ok ? '正解' : '不正解'}>
            <Icon name={ok ? 'maru' : 'batsu'} size={16} />
          </span>
        )}
        {index !== undefined && <span className="review-idx num">{index + 1}</span>}
        <span className="review-cat">
          {catShort(cat)}・問{q.n}
        </span>
        {badge && <span className="review-badge num">{badge}</span>}
        <button className={`star-btn sm ${marked ? 'on' : ''}`} onClick={() => toggleBookmark(q.id)} aria-pressed={marked} aria-label="ブックマーク">
          <Icon name="star" size={18} fill={marked} />
        </button>
      </div>
      <p className="review-q">{q.q}</p>
      {q.fig && (
        <div className="fig-note sm">
          <Icon name="image" size={14} /> 図・標識の問題
        </div>
      )}
      <div className="review-answers">
        {graded && (
          <span className="ra">
            あなた
            <b className={`mark ${ans === null ? 'none' : ans ? 'maru' : 'batsu'}`}>{ans === null ? '未回答' : ans ? '◯' : '×'}</b>
          </span>
        )}
        <span className="ra">
          正解<b className={`mark ${q.a ? 'maru' : 'batsu'}`}>{q.a ? '◯' : '×'}</b>
        </span>
        {graded && ok && q.e && !open && (
          <button className="link-btn" onClick={() => setOpen(true)}>
            解説を見る
          </button>
        )}
      </div>
      {showNote && (
        <div className="note">
          <span className="note-label">
            <Icon name="book" size={14} /> 解説
          </span>
          {q.e}
        </div>
      )}
    </li>
  );
}
