import { StrictMode, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  type GameState,
  STAGES,
  allMachines,
  autoRate,
  buyMachine,
  canStartManual,
  flow,
  fmt,
  fmtTime,
  hire,
  hireCost,
  manualTime,
  MAX_TOOL,
  newGame,
  nextStage,
  passiveIncome,
  startManual,
  tick,
  toolCost,
  upgradeTool,
  yen,
} from './model';
import './game.css';

const SAVE_KEY = 'zenbu-jidouka-v1';
const MAX_OFFLINE = 8 * 3600;

function load(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const g = JSON.parse(raw) as GameState;
      if (g.version === 1 && STAGES[g.stage]) return g;
    }
  } catch {
    /* 読めなければ新規 */
  }
  return newGame();
}

function save(g: GameState) {
  g.lastSave = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(g));
  } catch {
    /* 保存できない環境では何もしない */
  }
}

/** 長い時間をまとめて進める（バックグラウンドや留守中の分） */
function advance(g: GameState, sec: number): number {
  const before = g.totalEarned;
  const step = Math.max(0.25, sec / 20000);
  let left = sec;
  while (left > 0) {
    const d = Math.min(step, left);
    tick(g, d);
    left -= d;
  }
  return g.totalEarned - before;
}

type Pop = { id: number; step: number; text: string };

function Game() {
  const gRef = useRef<GameState | null>(null);
  if (!gRef.current) gRef.current = load();
  const g = gRef.current;

  const [, setFrame] = useState(0);
  const rerender = useCallback(() => setFrame((f) => (f + 1) % 1e9), []);
  const [pops, setPops] = useState<Pop[]>([]);
  const [welcome, setWelcome] = useState<{ sec: number; earned: number } | null>(null);
  const [hideClear, setHideClear] = useState(false);
  const popId = useRef(0);

  const addPop = useCallback((step: number, text: string) => {
    const id = ++popId.current;
    setPops((p) => [...p.slice(-12), { id, step, text }]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1000);
  }, []);

  // 留守中の進行
  useEffect(() => {
    const gone = Math.min(MAX_OFFLINE, (Date.now() - g.lastSave) / 1000);
    if (gone > 30) {
      const earned = advance(g, gone);
      g.lastSave = Date.now();
      if (earned > 0) setWelcome({ sec: gone, earned });
      rerender();
    }
  }, [g, rerender]);

  // ゲームループ
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastSaveAt = last;
    const loop = (now: number) => {
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 2) {
        advance(g, Math.min(dt, MAX_OFFLINE));
        dt = 0;
      }
      if (dt > 0) {
        const ev = tick(g, dt);
        if (ev.manualDone !== null) {
          const d = STAGES[g.stage].steps[ev.manualDone];
          const res = STAGES[g.stage].resources.find((r) => r.id === d.output);
          addPop(ev.manualDone, d.output === 'money' ? `+${yen(d.outAmt)}` : `+${res?.icon ?? ''}${d.outAmt}`);
        }
      }
      if (now - lastSaveAt > 5000) {
        save(g);
        lastSaveAt = now;
      }
      rerender();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onHide = () => save(g);
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [g, rerender, addPop]);

  const act = useCallback(
    (fn: (g: GameState) => unknown) => {
      fn(g);
      save(g);
      rerender();
    },
    [g, rerender],
  );

  // キーボード：1〜6 で手作業
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= STAGES[g.stage].steps.length) act((g) => startManual(g, n - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [g, act]);

  const reset = () => {
    if (!confirm('最初からやり直しますか？ 所持金も施設もすべて消えます。')) return;
    // ループや保存処理が同じオブジェクトを参照しているので、中身を入れ替える
    for (const k of Object.keys(g)) delete (g as Record<string, unknown>)[k];
    Object.assign(g, newGame());
    save(g);
    setHideClear(false);
    setWelcome(null);
    rerender();
  };

  if (g.finished) return <Ending g={g} onReset={reset} />;

  const def = STAGES[g.stage];
  const f = flow(g.stage, g.steps);
  const passive = passiveIncome(g);
  const automated = g.steps.filter((s) => s.machine).length;

  return (
    <div className="wrap">
      <header className="top">
        <div className="top-row">
          <div className="stage-badge">
            <span className="stage-icon">{def.icon}</span>
            <span>
              <small>
                ステージ {g.stage + 1} / {STAGES.length}
              </small>
              <b>{def.name}</b>
            </span>
          </div>
          <div className="auto-meter" title="機械化した工程の数">
            <span>全自動化</span>
            <b>
              {automated}/{def.steps.length}
            </b>
            <div className="meter">
              <i style={{ width: `${(automated / def.steps.length) * 100}%` }} />
            </div>
          </div>
        </div>
        <div className="money-row">
          <div className="money num">{yen(g.money)}</div>
          <div className="income num">
            +{yen(f.income + passive)}
            <small>/秒</small>
          </div>
        </div>
      </header>

      {welcome && (
        <div className="notice" onClick={() => setWelcome(null)}>
          おかえりなさい。留守にしていた {fmtTime(welcome.sec)} のあいだに <b className="num">{yen(welcome.earned)}</b> 稼いでいました。
          <span className="x">✕</span>
        </div>
      )}

      {g.cleared && hideClear && (
        <button className="next-banner" onClick={() => setHideClear(false)}>
          🎉 全自動化を達成！ 次のステージへ進む →
        </button>
      )}

      {g.stageTime < 90 && g.steps.every((s) => s.workers === 0) && (
        <p className="intro">
          {def.intro}
          <br />
          <b>目標：すべての工程を「機械化」して、あなたが何もしなくても回るようにすること。</b>
        </p>
      )}

      <You g={g} />

      <section className="inv" aria-label="在庫">
        {def.resources.map((r) => (
          <div key={r.id} className="chip">
            <span>{r.icon}</span>
            <small>{r.name}</small>
            <b className="num">{fmt(Math.floor(g.inv[r.id]))}</b>
          </div>
        ))}
      </section>

      <section className="line">
        {def.steps.map((d, i) => {
          const s = g.steps[i];
          const cap = autoRate(d, s);
          const ops = f.ops[i];
          const starved = s.workers > 0 && d.input && ops < cap * 0.98;
          const isBottle = s.workers > 0 && f.bottleneck === i && !allMachines(g);
          const inRes = def.resources.find((r) => r.id === d.input);
          const outRes = def.resources.find((r) => r.id === d.output);
          const mine = g.manual?.step === i ? g.manual : null;
          const mt = manualTime(d, s);
          const canManual = canStartManual(g, i);
          const hc = hireCost(d, s);
          const tc = toolCost(d, s);
          const need = def.needWorkers;
          return (
            <article key={i} className={`step${s.machine ? ' is-machine' : ''}${s.workers > 0 ? ' is-running' : ''}`}>
              <div className="step-head">
                <span className="step-icon">{d.icon}</span>
                <div className="step-title">
                  <b>{d.name}</b>
                  <small>
                    {inRes ? (
                      <>
                        {inRes.icon}×{d.inAmt} →{' '}
                      </>
                    ) : null}
                    {outRes ? `${outRes.icon}×${d.outAmt}` : `🪙 ${yen(d.outAmt)}`}
                  </small>
                </div>
                <div className="tags">
                  {s.machine && <span className="tag good">自動化済み</span>}
                  {isBottle && <span className="tag warn">ボトルネック</span>}
                  {starved && <span className="tag muted">材料待ち</span>}
                </div>
              </div>

              <button className={`manual${mine ? ' busy' : ''}`} disabled={!canManual && !mine} onClick={() => act((g) => startManual(g, i))}>
                <span className="fill" style={{ width: mine ? `${Math.min(100, (mine.t / mt) * 100)}%` : '0%' }} />
                <span className="manual-label">
                  <kbd>{i + 1}</kbd>
                  {mine ? '作業中…' : inRes && !canManual && !g.manual ? `${inRes.name}が足りない` : '自分でやる'}
                  <small>{mt.toFixed(1)}秒</small>
                </span>
                {pops
                  .filter((p) => p.step === i)
                  .map((p) => (
                    <span key={p.id} className="pop num">
                      {p.text}
                    </span>
                  ))}
              </button>

              <div className="crew">
                <div className="people" aria-label={`${d.worker} ${s.workers}人`}>
                  {s.machine && <span className="machine-icon">🤖</span>}
                  {Array.from({ length: Math.min(s.workers, 12) }, (_, k) => (
                    <span key={k} className={`person${s.workers > 0 && !starved ? ' working' : ''}`} style={{ animationDelay: `${(k * 0.13) % 0.8}s` }}>
                      🧑‍🔧
                    </span>
                  ))}
                  {s.workers > 12 && <span className="more">+{s.workers - 12}</span>}
                  {s.workers === 0 && <span className="nobody">まだ誰もいません</span>}
                </div>
                <div className="rate num">
                  {s.workers > 0 ? (
                    <>
                      {ops < 10 ? ops.toFixed(2) : fmt(ops)}
                      <small>回/秒</small>
                    </>
                  ) : (
                    '—'
                  )}
                </div>
              </div>

              <div className="buys">
                <button className="buy" disabled={g.money < hc} onClick={() => act((g) => hire(g, i))}>
                  <span>
                    {d.worker}を雇う <small>{s.workers}人</small>
                  </span>
                  <b className="num">{yen(hc)}</b>
                </button>
                <button className="buy" disabled={s.tool >= MAX_TOOL || g.money < tc} onClick={() => act((g) => upgradeTool(g, i))}>
                  <span>
                    道具を改良 <small>Lv{s.tool}</small>
                  </span>
                  <b className="num">{s.tool >= MAX_TOOL ? '最大' : yen(tc)}</b>
                </button>
                {!s.machine && (
                  <button
                    className="buy machine"
                    disabled={s.workers < need || g.money < d.machineCost}
                    onClick={() => act((g) => buyMachine(g, i))}
                  >
                    <span>
                      {d.machine}で機械化 <small>{s.workers < need ? `あと${need - s.workers}人雇うと解禁` : '速度×4・自動化'}</small>
                    </span>
                    <b className="num">{yen(d.machineCost)}</b>
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {g.completed.length > 0 && <Facilities g={g} />}

      <footer className="foot">
        <span>
          プレイ時間 {fmtTime(g.playTime)} ・ 手作業 {g.manualCount.toLocaleString('ja-JP')}回
        </span>
        <button className="link" onClick={reset}>
          最初からやり直す
        </button>
      </footer>

      {g.cleared && !hideClear && <ClearModal g={g} onNext={() => {
            act(nextStage);
            window.scrollTo(0, 0);
          }} onLater={() => setHideClear(true)} />}
    </div>
  );
}

function You({ g }: { g: GameState }) {
  const def = STAGES[g.stage];
  if (allMachines(g)) {
    return (
      <div className="you done">
        <span className="avatar">🏖️</span>
        <div>
          <b>あなた</b>
          <small>もう何もしなくても、ここは回り続けます。</small>
        </div>
      </div>
    );
  }
  const m = g.manual;
  const d = m ? def.steps[m.step] : null;
  return (
    <div className={`you${m ? ' busy' : ''}`}>
      <span className="avatar">{m ? '🏃' : '🧍'}</span>
      <div>
        <b>あなた</b>
        <small>{d ? `「${d.name}」をしています` : '手が空いています。工程の「自分でやる」を押しましょう'}</small>
      </div>
      {m && d && (
        <div className="you-bar">
          <i style={{ width: `${Math.min(100, (m.t / manualTime(d, g.steps[m.step])) * 100)}%` }} />
        </div>
      )}
    </div>
  );
}

function Facilities({ g }: { g: GameState }) {
  return (
    <section className="facilities">
      <h2>稼働中の施設</h2>
      <p className="sub">全自動になった施設は、あなたが離れても稼ぎ続けます。</p>
      <ul>
        {g.completed.map((c) => {
          const st = STAGES[c.stage];
          return (
            <li key={c.stage}>
              <span className="f-icon">{st.icon}</span>
              <span className="f-name">
                {st.name}
                <small>{fmtTime(c.time)}で全自動化</small>
              </span>
              <b className="num">+{yen(c.rate)}/秒</b>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ClearModal({ g, onNext, onLater }: { g: GameState; onNext: () => void; onLater: () => void }) {
  const def = STAGES[g.stage];
  const rate = flow(g.stage, g.steps).income;
  const last = g.stage + 1 >= STAGES.length;
  return (
    <div className="modal-bg">
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-icon">{def.icon}</div>
        <h2>{def.name}、全自動化！</h2>
        <p>
          最初はあなたがひとつずつ手で作っていたのが、もう誰も指示しなくても回ります。
          <br />
          この施設はこれからも <b className="num">{yen(rate)}/秒</b> を稼ぎ続けます。
        </p>
        <dl className="stats">
          <div>
            <dt>かかった時間</dt>
            <dd>{fmtTime(g.stageTime)}</dd>
          </div>
          <div>
            <dt>所持金（引き継ぎ）</dt>
            <dd className="num">{yen(g.money)}</dd>
          </div>
        </dl>
        <button className="primary" onClick={onNext}>
          {last ? 'エンディングへ' : `次のステージ「${STAGES[g.stage + 1].name}」へ →`}
        </button>
        <button className="link" onClick={onLater}>
          もう少しここを眺める
        </button>
      </div>
    </div>
  );
}

function Ending({ g, onReset }: { g: GameState; onReset: () => void }) {
  const total = g.completed.reduce((a, c) => a + c.time, 0);
  return (
    <div className="wrap ending">
      <div className="end-hero">
        <div className="end-icons">{STAGES.map((s) => s.icon).join(' ')}</div>
        <h1>ぜんぶ自動化しました</h1>
        <p>
          レモンを手で摘んでいたあなたは、いまやロケットまで全自動で打ち上げています。
          <br />
          もうあなたが働く必要はありません。お金は勝手に増え続けます。
        </p>
      </div>
      <div className="end-money">
        <div className="money num">{yen(g.money)}</div>
        <div className="income num">
          +{yen(passiveIncome(g))}
          <small>/秒</small>
        </div>
      </div>
      <dl className="stats">
        <div>
          <dt>全自動化までの時間</dt>
          <dd>{fmtTime(total)}</dd>
        </div>
        <div>
          <dt>あなたが手を動かした回数</dt>
          <dd className="num">{g.manualCount.toLocaleString('ja-JP')}回</dd>
        </div>
        <div>
          <dt>累計の売上</dt>
          <dd className="num">{yen(g.totalEarned)}</dd>
        </div>
      </dl>
      <Facilities g={g} />
      <footer className="foot">
        <span>プレイ時間 {fmtTime(g.playTime)}</span>
        <button className="link" onClick={onReset}>
          最初からあそぶ
        </button>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Game />
  </StrictMode>,
);
