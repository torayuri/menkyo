import { catById, questions } from '../data';
import { startBookmarks, startCategories, startRandom, startWeak } from '../start';
import { discardCurrent, updateSettings, useStore } from '../store';
import { pct, useStats } from '../stats';
import { Icon, Segmented, Toggle, confirmDialog, go } from '../ui';

export default function Home() {
  const state = useStore();
  const stats = useStats(state.sessions);
  const { settings, current } = state;
  const figCount = questions.filter((q) => q.fig).length;
  const rate = stats.attempts ? stats.correct / stats.attempts : 0;
  const coverage = stats.seen / questions.length;

  return (
    <div className="page home">
      <header className="brand">
        <div className="brand-mark" aria-hidden="true">
          <span className="bm-maru" />
          <span className="bm-batsu" />
        </div>
        <div>
          <div className="brand-name">学科◯×ドリル</div>
          <div className="brand-sub">普通免許 学科試験 {questions.length}問</div>
        </div>
        <button className="icon-btn brand-history" onClick={() => go('history')} aria-label="学習記録">
          <Icon name="chart" />
        </button>
      </header>

      <section className="overview" onClick={() => go('history')} role="button" tabIndex={0}>
        <div className="ov-item">
          <div className="ov-label">正答率</div>
          <div className="ov-value num">
            {stats.attempts ? pct(rate) : '–'}
            <small>%</small>
          </div>
        </div>
        <div className="ov-item">
          <div className="ov-label">学習済み</div>
          <div className="ov-value num">
            {stats.seen}
            <small>/{questions.length}</small>
          </div>
          <div className="ov-bar">
            <span style={{ width: `${coverage * 100}%` }} />
          </div>
        </div>
        <div className="ov-item">
          <div className="ov-label">連続学習</div>
          <div className="ov-value num">
            {stats.streak}
            <small>日</small>
          </div>
        </div>
        <div className="ov-more">
          学習記録を見る <Icon name="right" size={16} />
        </div>
      </section>

      {current && (
        <section className="resume">
          <div className="resume-info">
            <div className="eyebrow">解答の途中</div>
            <div className="resume-title">{current.title}</div>
            <div className="resume-progress">
              <div className="bar">
                <span style={{ width: `${(current.answers.filter((a) => a !== null).length / current.ids.length) * 100}%` }} />
              </div>
              <span className="num">
                {current.answers.filter((a) => a !== null).length} / {current.ids.length}
              </span>
            </div>
          </div>
          <div className="resume-actions">
            <button
              className="btn ghost sm"
              onClick={async () => {
                if (await confirmDialog({ title: '途中の問題を破棄しますか？', body: '回答は記録されません。', ok: '破棄する', danger: true })) discardCurrent();
              }}
            >
              破棄
            </button>
            <button className="btn primary sm" onClick={() => go('quiz')}>
              続きから
            </button>
          </div>
        </section>
      )}

      <button className="hero-card" onClick={startRandom}>
        <div className="hero-shapes" aria-hidden="true">
          <span className="hs-maru" />
          <span className="hs-batsu" />
        </div>
        <div className="eyebrow light">ランダム出題</div>
        <div className="hero-title">
          全{settings.excludeFig ? questions.length - figCount : questions.length}問から
          <br />
          <span className="num">{settings.randomCount}</span>問チャレンジ
        </div>
        <div className="hero-cta">
          スタート <Icon name="play" size={16} fill />
        </div>
      </button>

      <div className="mode-grid">
        <button className="mode-card" onClick={() => go('categories')}>
          <span className="mode-icon c-blue">
            <Icon name="grid" />
          </span>
          <span className="mode-title">項目別に解く</span>
          <span className="mode-sub">教習項目・模擬テスト</span>
        </button>
        <button className="mode-card" onClick={startWeak} disabled={!stats.weakIds.length}>
          <span className="mode-icon c-red">
            <Icon name="target" />
          </span>
          <span className="mode-title">苦手を復習</span>
          <span className="mode-sub">{stats.weakIds.length ? `直近で間違えた ${stats.weakIds.length}問` : 'まだありません'}</span>
        </button>
        <button className="mode-card" onClick={startBookmarks} disabled={!state.bookmarks.length}>
          <span className="mode-icon c-yellow">
            <Icon name="star" />
          </span>
          <span className="mode-title">ブックマーク</span>
          <span className="mode-sub">{state.bookmarks.length ? `${state.bookmarks.length}問` : '問題の☆で追加'}</span>
        </button>
        <button className="mode-card" onClick={() => go('history')}>
          <span className="mode-icon c-green">
            <Icon name="chart" />
          </span>
          <span className="mode-title">学習記録</span>
          <span className="mode-sub">{state.sessions.length ? `${state.sessions.length}回 / ${stats.attempts}問` : 'まだありません'}</span>
        </button>
      </div>

      <section className="section">
        <h2 className="section-title">模擬テスト</h2>
        <div className="mock-row">
          {[
            { id: 'kari-A', label: '仮免 A', n: 50 },
            { id: 'kari-B', label: '仮免 B', n: 50 },
            { id: 'hon', label: '本免', n: 90 },
          ].map((m) => {
            const cs = stats.byCategory.get(m.id)!;
            return (
              <button key={m.id} className="mock-card" onClick={() => startCategories([m.id], catById.get(m.id)!.title, false)}>
                <span className="mock-label">{m.label}</span>
                <span className="mock-n num">{m.n}問</span>
                <span className="mock-rate">{cs.attempts ? `正答率 ${pct(cs.correct / cs.attempts)}%` : '未挑戦'}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">出題設定</h2>
        <div className="settings card">
          <div className="setting-row">
            <span className="toggle-label">1回の出題数</span>
            <Segmented
              label="出題数"
              value={settings.randomCount}
              onChange={(v) => updateSettings({ randomCount: v })}
              options={[25, 50, 100].map((n) => ({ value: n, label: `${n}問` }))}
            />
          </div>
          <Toggle label="まだ解いていない問題を優先" hint="ランダム出題で未出題の問題から選びます" checked={settings.preferUnseen} onChange={(v) => updateSettings({ preferUnseen: v })} />
          <Toggle label="図・標識の問題を出題しない" hint={`画像が必要な ${figCount}問 を除外します（模擬テストを除く）`} checked={settings.excludeFig} onChange={(v) => updateSettings({ excludeFig: v })} />
          <Toggle label="回答したら次の問題へ" hint="◯×を選ぶと自動で次に進みます" checked={settings.autoAdvance} onChange={(v) => updateSettings({ autoAdvance: v })} />
        </div>
      </section>

      <footer className="foot">学習記録はこのブラウザに保存されます。記録画面からバックアップできます。</footer>
    </div>
  );
}
