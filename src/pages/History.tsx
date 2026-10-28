import { useRef, useState } from 'react';
import { GROUPS, PASS_RATE, catTitle, categories, qById, questions } from '../data';
import { ActivityCalendar, TrendChart } from '../charts';
import { startCategories, startWeak } from '../start';
import { normalize, replaceState, resetState, useStore } from '../store';
import { formatDate, formatDuration, pct, scoreSession, useStats } from '../stats';
import { Icon, TopBar, confirmDialog, go } from '../ui';
import { ReviewItem } from './Result';

const MODE_LABEL: Record<string, string> = {
  random: 'ランダム',
  category: '項目別',
  weak: '苦手',
  retry: '解き直し',
  bookmark: 'ブックマーク',
};

export default function History() {
  const state = useStore();
  const stats = useStats(state.sessions);
  const [weakShown, setWeakShown] = useState(10);
  const [sessShown, setSessShown] = useState(15);
  const fileRef = useRef<HTMLInputElement>(null);
  const rate = stats.attempts ? stats.correct / stats.attempts : 0;
  const totalTime = state.sessions.reduce((t, s) => t + (s.elapsed || 0), 0);

  // 苦手：直近不正解の問題を、正答率が低い順に
  const weak = stats.weakIds
    .map((id) => ({ q: qById.get(id)!, st: stats.byQuestion.get(id)! }))
    .sort((a, b) => a.st.correct / a.st.attempts - b.st.correct / b.st.attempts || b.st.attempts - a.st.attempts);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `menkyo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (file: File) => {
    try {
      const next = normalize(JSON.parse(await file.text()));
      if (!next) throw new Error('bad');
      const ok = await confirmDialog({
        title: 'バックアップを読み込みますか？',
        body: `${next.sessions.length}回分の記録で、現在の記録を置き換えます。`,
        ok: '読み込む',
        danger: true,
      });
      if (ok) replaceState(next);
    } catch {
      await confirmDialog({ title: '読み込めませんでした', body: 'このサイトで書き出したバックアップファイルを選んでください。', ok: 'OK', cancel: '閉じる' });
    }
  };

  const sessions = state.sessions.slice().reverse();

  return (
    <div className="page history">
      <TopBar title="学習記録" onBack={() => go('')} />

      <section className="stat-grid">
        <div className="stat big">
          <span className="stat-label">累計正答率</span>
          <span className="stat-value num">
            {stats.attempts ? pct(rate) : '–'}
            <small>%</small>
          </span>
          <span className="stat-foot num">
            {stats.correct} / {stats.attempts}問 正解
          </span>
        </div>
        <div className="stat wide">
          <span className="stat-label">学習済み</span>
          <span className="stat-value num">
            {stats.seen}
            <small>/{questions.length}</small>
          </span>
          <div className="stack-bar" title={`正解済み ${stats.mastered}問 / 直近不正解 ${stats.weakIds.length}問 / 未出題 ${questions.length - stats.seen}問`}>
            <span className="sb-mastered" style={{ width: `${(stats.mastered / questions.length) * 100}%` }} />
            <span className="sb-weak" style={{ width: `${(stats.weakIds.length / questions.length) * 100}%` }} />
          </div>
          <span className="stat-foot">
            <span className="dot mastered" />
            正解済み {stats.mastered} <span className="dot weak" />
            苦手 {stats.weakIds.length}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">
            <Icon name="flame" size={14} /> 連続学習
          </span>
          <span className="stat-value num">
            {stats.streak}
            <small>日</small>
          </span>
          <span className="stat-foot num">今日 {stats.today}問</span>
        </div>
        <div className="stat">
          <span className="stat-label">
            <Icon name="clock" size={14} /> 学習時間
          </span>
          <span className="stat-value small">{formatDuration(totalTime)}</span>
          <span className="stat-foot num">{state.sessions.length}回 挑戦</span>
        </div>
      </section>

      {state.sessions.length === 0 ? (
        <div className="empty big">
          <Icon name="chart" size={32} />
          <p>まだ記録がありません。問題を解いて答え合わせをすると、ここに記録が貯まります。</p>
          <button className="btn primary" onClick={() => go('')}>
            問題を解きに行く
          </button>
        </div>
      ) : (
        <>
          <section className="section">
            <h2 className="section-title">正答率の推移</h2>
            <div className="card pad-sm">
              <TrendChart sessions={state.sessions} />
              <p className="chart-note">直近30回。点をタップするとその回の結果を開きます。</p>
            </div>
          </section>

          <section className="section">
            <h2 className="section-title">学習カレンダー</h2>
            <div className="card pad-sm">
              <ActivityCalendar daily={stats.daily} />
            </div>
          </section>
        </>
      )}

      <section className="section">
        <h2 className="section-title">項目別の成績</h2>
        <div className="card cat-table">
          {GROUPS.map((g) => (
            <div key={g.id} className="ct-group">
              <div className="ct-group-label">{g.label}</div>
              {categories
                .filter((c) => c.group === g.id)
                .map((c) => {
                  const cs = stats.byCategory.get(c.id)!;
                  const r = cs.attempts ? cs.correct / cs.attempts : null;
                  return (
                    <button key={c.id} className="ct-row" onClick={() => startCategories([c.id], catTitle(c), false)} title={`${c.title}を解く`}>
                      <span className="ct-name">
                        <span className="ct-no num">{c.no ?? ''}</span>
                        {c.title}
                      </span>
                      <span className="ct-bar" aria-hidden="true">
                        <span className={`ct-fill ${r === null ? '' : r >= PASS_RATE ? 'good' : r < 0.7 ? 'bad' : ''}`} style={{ width: `${(r ?? 0) * 100}%` }} />
                        <span className="ct-pass" style={{ left: `${PASS_RATE * 100}%` }} />
                      </span>
                      <span className="ct-rate num">{r === null ? '—' : `${pct(r)}%`}</span>
                      <span className="ct-cov num">
                        {cs.seen}/{c.count}
                      </span>
                    </button>
                  );
                })}
            </div>
          ))}
          <div className="ct-foot">
            棒＝累計正答率（縦線は合格ライン90%）／右端＝出題済み問題数。行をタップでその項目を解けます。
          </div>
        </div>
      </section>

      {weak.length > 0 && (
        <section className="section">
          <div className="review-head">
            <h2 className="section-title">苦手な問題 {weak.length}</h2>
            <button className="btn primary sm" onClick={startWeak}>
              <Icon name="target" size={16} /> まとめて復習
            </button>
          </div>
          <ol className="review-list">
            {weak.slice(0, weakShown).map(({ q, st }) => (
              <ReviewItem key={q.id} q={q} marked={state.bookmarks.includes(q.id)} badge={`${st.attempts}回中 ${st.correct}回正解`} />
            ))}
          </ol>
          {weak.length > weakShown && (
            <button className="btn ghost wide" onClick={() => setWeakShown((n) => n + 20)}>
              さらに表示（残り {weak.length - weakShown}問）
            </button>
          )}
        </section>
      )}

      {sessions.length > 0 && (
        <section className="section">
          <h2 className="section-title">これまでの挑戦</h2>
          <ul className="session-list">
            {sessions.slice(0, sessShown).map((s) => {
              const sc = scoreSession(s);
              return (
                <li key={s.id}>
                  <button className="session-row" onClick={() => go(`result/${s.id}`)}>
                    <span className={`sr-score num ${sc.rate >= PASS_RATE ? 'good' : ''}`}>
                      {pct(sc.rate)}
                      <small>%</small>
                    </span>
                    <span className="sr-body">
                      <span className="sr-title">{s.title}</span>
                      <span className="sr-meta">
                        <span className="pill">{MODE_LABEL[s.mode] ?? s.mode}</span>
                        {formatDate(s.finishedAt)} ・ {sc.correct}/{sc.total}問 ・ {formatDuration(s.elapsed || 0)}
                      </span>
                    </span>
                    <Icon name="right" size={18} />
                  </button>
                </li>
              );
            })}
          </ul>
          {sessions.length > sessShown && (
            <button className="btn ghost wide" onClick={() => setSessShown((n) => n + 30)}>
              さらに表示
            </button>
          )}
        </section>
      )}

      <section className="section">
        <h2 className="section-title">データ管理</h2>
        <div className="card data-actions">
          <p className="muted">記録はこのブラウザ内に保存されています。機種変更やブラウザの切り替え前にバックアップしてください。</p>
          <div className="row-btns">
            <button className="btn ghost" onClick={exportData}>
              <Icon name="download" size={18} /> バックアップを保存
            </button>
            <button className="btn ghost" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={18} /> バックアップから復元
            </button>
            <button
              className="btn ghost danger-text"
              onClick={async () => {
                if (await confirmDialog({ title: 'すべての記録を削除しますか？', body: '回答履歴・ブックマークが消え、元に戻せません。', ok: '削除する', danger: true })) resetState();
              }}
            >
              <Icon name="trash" size={18} /> 記録をリセット
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importData(f);
              e.target.value = '';
            }}
          />
        </div>
      </section>
    </div>
  );
}
