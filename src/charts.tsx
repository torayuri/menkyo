import { useState } from 'react';
import { PASS_RATE } from './data';
import type { Session } from './store';
import { dayKey, formatDate, pct, scoreSession } from './stats';
import { go, useWidth } from './ui';

/** 回ごとの正答率の推移（1 系列の折れ線） */
export function TrendChart({ sessions }: { sessions: Session[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const data = sessions.slice(-30).map((s) => ({ s, ...scoreSession(s) }));
  const H = 200;
  const pad = { l: 34, r: 12, t: 14, b: 22 };
  const w = Math.max(width, 200);
  const iw = w - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (r: number) => pad.t + (1 - r) * ih;
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.rate).toFixed(1)}`).join('');
  const area = data.length > 1 ? `${line}L${x(data.length - 1)},${y(0)}L${x(0)},${y(0)}Z` : '';

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = 0;
    data.forEach((_, i) => {
      if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    });
    setHover(best);
  };

  const h = hover !== null ? data[hover] : null;
  return (
    <div className="chart" ref={ref}>
      {width > 0 && (
        <svg
          width={w}
          height={H}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          onClick={() => h && go(`result/${h.s.id}`)}
          role="img"
          aria-label={`直近${data.length}回の正答率の推移`}
        >
          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line className="grid" x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} />
              <text className="axis" x={pad.l - 8} y={y(t) + 4} textAnchor="end">
                {t * 100}
              </text>
            </g>
          ))}
          <line className="pass-line" x1={pad.l} x2={w - pad.r} y1={y(PASS_RATE)} y2={y(PASS_RATE)} />
          <text className="axis pass-text" x={w - pad.r} y={y(PASS_RATE) - 5} textAnchor="end">
            合格ライン 90%
          </text>
          {area && <path className="trend-area" d={area} />}
          <path className="trend-line" d={line} />
          {h && <line className="crosshair" x1={x(hover!)} x2={x(hover!)} y1={pad.t} y2={y(0)} />}
          {data.map((d, i) => (
            <circle key={d.s.id} className={`trend-dot ${i === hover ? 'on' : ''}`} cx={x(i)} cy={y(d.rate)} r={i === hover ? 6 : 4} />
          ))}
          <text className="axis" x={pad.l} y={H - 4}>
            {data.length > 1 ? `${data.length}回前` : ''}
          </text>
          <text className="axis" x={w - pad.r} y={H - 4} textAnchor="end">
            最新
          </text>
        </svg>
      )}
      {h && (
        <div className="tooltip" style={{ left: Math.min(Math.max(x(hover!), 80), w - 80), top: y(h.rate) - 12 }}>
          <div className="tt-title">{h.s.title}</div>
          <div className="tt-row">
            <span>{formatDate(h.s.finishedAt)}</span>
            <b className="num">
              {pct(h.rate)}% <small>({h.correct}/{h.total})</small>
            </b>
          </div>
        </div>
      )}
    </div>
  );
}

/** 日ごとの回答数のカレンダー（GitHub の草のような表示） */
export function ActivityCalendar({ daily, weeks = 18 }: { daily: Map<string, number>; weeks?: number }) {
  const [hover, setHover] = useState<{ key: string; n: number; x: number; y: number } | null>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - today.getDay() - (weeks - 1) * 7);
  const cell = 14;
  const gap = 3;
  const level = (n: number) => (n === 0 ? 0 : n < 25 ? 1 : n < 50 ? 2 : n < 100 ? 3 : 4);

  const cols: { key: string; n: number; future: boolean; date: Date }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      const key = dayKey(date.getTime());
      col.push({ key, n: daily.get(key) ?? 0, future: date > today, date });
    }
    cols.push(col);
  }
  const width = weeks * (cell + gap) - gap;

  return (
    <div className="calendar">
      <div className="cal-scroll">
        <svg width={width + 22} height={7 * (cell + gap) + 16} role="img" aria-label="日ごとの回答数">
          {['日', '', '火', '', '木', '', '土'].map((l, i) => (
            <text key={i} className="axis" x={0} y={16 + i * (cell + gap) + cell - 3}>
              {l}
            </text>
          ))}
          {cols.map((col, w) => (
            <g key={w} transform={`translate(${22 + w * (cell + gap)}, 16)`}>
              {col[0].date.getDate() <= 7 && (
                <text className="axis" x={0} y={-5}>
                  {col[0].date.getMonth() + 1}月
                </text>
              )}
              {col.map((c, d) =>
                c.future ? null : (
                  <rect
                    key={c.key}
                    className={`cal-cell l${level(c.n)}`}
                    y={d * (cell + gap)}
                    width={cell}
                    height={cell}
                    rx={3}
                    onPointerEnter={() => setHover({ key: c.key, n: c.n, x: 22 + w * (cell + gap) + cell / 2, y: 16 + d * (cell + gap) })}
                    onPointerLeave={() => setHover(null)}
                  >
                    <title>{`${c.key}：${c.n}問`}</title>
                  </rect>
                ),
              )}
            </g>
          ))}
        </svg>
        {hover && (
          <div className="tooltip" style={{ left: hover.x, top: hover.y - 6 }}>
            <div className="tt-row">
              <span>{hover.key.slice(5).replace('-', '/')}</span>
              <b className="num">{hover.n}問</b>
            </div>
          </div>
        )}
      </div>
      <div className="cal-legend">
        少 {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`cal-sw l${l}`} />)} 多
      </div>
    </div>
  );
}
