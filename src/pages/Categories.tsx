import { useState } from 'react';
import { GROUPS, catById, catTitle, categories, questions } from '../data';
import { startCategories } from '../start';
import { useStore } from '../store';
import { pct, useStats } from '../stats';
import { Icon, TopBar, go } from '../ui';

export default function Categories() {
  const state = useStore();
  const stats = useStats(state.sessions);
  const [selected, setSelected] = useState<string[]>([]);
  const [doShuffle, setDoShuffle] = useState(false);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const total = questions.filter(
    (q) => selected.includes(q.cat) && !(state.settings.excludeFig && q.fig && !['kari', 'hon'].includes(catById.get(q.cat)!.group)),
  ).length;

  const start = () => {
    const picked = categories.filter((c) => selected.includes(c.id));
    const title = picked.length === 1 ? catTitle(picked[0]) : `${picked.length}項目まとめて`;
    startCategories(selected, title, doShuffle);
  };

  return (
    <div className="page categories">
      <TopBar title="項目別に解く" onBack={() => go('')} />
      <p className="lead">項目をタップして選択（複数可）。右の ▶ でその項目だけをすぐに始められます。</p>

      {GROUPS.map((g) => {
        const cats = categories.filter((c) => c.group === g.id);
        const allOn = cats.every((c) => selected.includes(c.id));
        return (
          <section key={g.id} className="section">
            <div className="group-head">
              <div>
                <h2 className="section-title">{g.label}</h2>
                <div className="group-sub">{g.sub}</div>
              </div>
              <button
                className="link-btn"
                onClick={() =>
                  setSelected((s) => (allOn ? s.filter((id) => !cats.some((c) => c.id === id)) : [...new Set([...s, ...cats.map((c) => c.id)])]))
                }
              >
                {allOn ? '選択解除' : 'すべて選択'}
              </button>
            </div>
            <ul className="cat-list">
              {cats.map((c) => {
                const cs = stats.byCategory.get(c.id)!;
                const on = selected.includes(c.id);
                const rate = cs.attempts ? cs.correct / cs.attempts : null;
                return (
                  <li key={c.id} className={`cat-item ${on ? 'on' : ''}`}>
                    <button className="cat-main" onClick={() => toggle(c.id)} aria-pressed={on}>
                      <span className="cat-check" aria-hidden="true">
                        <Icon name="check" size={14} />
                      </span>
                      <span className="cat-no num">{c.no ?? (c.id === 'hon' ? '本' : c.id.slice(-1))}</span>
                      <span className="cat-body">
                        <span className="cat-title">{c.title}</span>
                        <span className="cat-meta">
                          <span>{c.count}問</span>
                          <span className="cat-progress">
                            <span className="cp-bar">
                              <span className="cp-seen" style={{ width: `${(cs.seen / c.count) * 100}%` }} />
                              <span className="cp-mastered" style={{ width: `${(cs.mastered / c.count) * 100}%` }} />
                            </span>
                            <span className="num">
                              {cs.mastered}/{c.count}
                            </span>
                          </span>
                        </span>
                      </span>
                      <span className={`cat-rate num ${rate === null ? 'none' : rate >= 0.9 ? 'good' : rate < 0.7 ? 'bad' : ''}`}>
                        {rate === null ? '—' : `${pct(rate)}%`}
                      </span>
                    </button>
                    <button className="cat-go" aria-label={`${c.title}を解く`} onClick={() => startCategories([c.id], catTitle(c), doShuffle)}>
                      <Icon name="play" size={14} fill />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <div className="legend-note">
        <span className="ln-item">
          <span className="sw mastered" />
          正解済み
        </span>
        <span className="ln-item">
          <span className="sw seen" />
          直近不正解
        </span>
        <span className="ln-item">右端の数字は累計正答率</span>
      </div>

      <div className={`dock ${selected.length ? 'show' : ''}`}>
        <div className="dock-inner">
          <button className={`chip ${doShuffle ? 'on' : ''}`} onClick={() => setDoShuffle((v) => !v)} aria-pressed={doShuffle}>
            <Icon name="shuffle" size={16} /> シャッフル
          </button>
          <button className="btn primary grow" onClick={start} disabled={!selected.length}>
            {selected.length}項目・{total}問を解く
          </button>
        </div>
      </div>
    </div>
  );
}
