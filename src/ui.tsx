import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/* ---------- ルーティング（ハッシュ） ---------- */

export function useRoute(): string[] {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const f = () => setHash(location.hash);
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  return hash.replace(/^#\/?/, '').split('/').filter(Boolean);
}

export function go(path: string, replace = false): void {
  const url = `#/${path}`;
  if (replace) {
    history.replaceState(null, '', url);
    dispatchEvent(new HashChangeEvent('hashchange'));
  } else location.hash = url;
}

/* ---------- アイコン ---------- */

const paths: Record<string, ReactNode> = {
  maru: <circle cx="12" cy="12" r="7.5" />,
  batsu: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  left: <path d="M15 5l-7 7 7 7" />,
  right: <path d="M9 5l7 7-7 7" />,
  shuffle: <path d="M4 7h3.5c2 0 3.2 1 4.3 2.7l1.4 2.3c1.1 1.8 2.3 2.8 4.3 2.8H20M17 4.5L20 7l-3 2.5M4 17h3.5c1.3 0 2.2-.4 3-1.2M13.5 8.2c.8-.8 1.7-1.2 3-1.2M17 14.5l3 2.5-3 2.5" />,
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  flame: <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 01-10 0c0-2 1-3.5 2-4.5.3 1.6 1 2.5 2 3 0-3 0-5.5 1-8.5z" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r=".6" />
    </>
  ),
  star: <path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z" />,
  grid: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />,
  play: <path d="M8 5.5v13l10-6.5z" />,
  repeat: <path d="M4 12a8 8 0 0113.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 01-13.7 5.6L4 15.5M4 20v-4.5h4.5" />,
  home: <path d="M4 11l8-7 8 7M6 9.5V20h12V9.5" />,
  image: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <path d="M3.5 16l5-5 4 4 2.5-2.5 5.5 5.5" />
    </>
  ),
  book: <path d="M5 4.5h9a3 3 0 013 3V20H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h9" />,
  download: <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />,
  upload: <path d="M12 16V5M7 9.5l5-5 5 5M5 20h14" />,
  trash: <path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8v.01" />
    </>
  ),
};

export function Icon({ name, size = 20, fill = false }: { name: keyof typeof paths | string; size?: number; fill?: boolean }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={name === 'maru' || name === 'batsu' ? 2.6 : 1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

/* ---------- 円グラフ（正答率リング） ---------- */

export function Ring({ rate, size = 168, stroke = 14, pass, children }: { rate: number; size?: number; stroke?: number; pass?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(rate));
    return () => cancelAnimationFrame(id);
  }, [rate]);
  const passAngle = pass !== undefined ? pass * 2 * Math.PI - Math.PI / 2 : 0;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className={`ring-value ${pass !== undefined && rate >= pass ? 'is-pass' : ''}`}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0.002, shown))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {pass !== undefined && (
          <line
            className="ring-pass"
            x1={size / 2 + (r - stroke / 2 - 3) * Math.cos(passAngle)}
            y1={size / 2 + (r - stroke / 2 - 3) * Math.sin(passAngle)}
            x2={size / 2 + (r + stroke / 2 + 3) * Math.cos(passAngle)}
            y2={size / 2 + (r + stroke / 2 + 3) * Math.sin(passAngle)}
          />
        )}
      </svg>
      <div className="ring-body">{children}</div>
    </div>
  );
}

/* ---------- 小物 ---------- */

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="toggle-row">
      <span>
        <span className="toggle-label">{label}</span>
        {hint && <span className="toggle-hint">{hint}</span>}
      </span>
      <input type="checkbox" className="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} role="radio" aria-checked={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function TopBar({ title, onBack, right }: { title: ReactNode; onBack?: () => void; right?: ReactNode }) {
  return (
    <header className="topbar">
      {onBack ? (
        <button className="icon-btn" onClick={onBack} aria-label="戻る">
          <Icon name="left" />
        </button>
      ) : (
        <span className="topbar-spacer" />
      )}
      <div className="topbar-title">{title}</div>
      <div className="topbar-right">{right ?? <span className="topbar-spacer" />}</div>
    </header>
  );
}

export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/* ---------- 確認ダイアログ ---------- */

interface Ask {
  title: string;
  body?: string;
  ok: string;
  cancel?: string;
  danger?: boolean;
  resolve: (v: boolean) => void;
}

let pushAsk: ((a: Ask | null) => void) | null = null;

export function confirmDialog(opts: Omit<Ask, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => {
    if (!pushAsk) return resolve(window.confirm(opts.title));
    pushAsk({ ...opts, resolve });
  });
}

export function DialogHost() {
  const [ask, setAsk] = useState<Ask | null>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    pushAsk = setAsk;
    return () => {
      pushAsk = null;
    };
  }, []);
  useEffect(() => {
    if (!ask) return;
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });
  if (!ask) return null;
  const close = (v: boolean) => {
    ask.resolve(v);
    setAsk(null);
  };
  return (
    <div className="dialog-backdrop" onClick={() => close(false)}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="dlg-title">{ask.title}</h2>
        {ask.body && <p>{ask.body}</p>}
        <div className="dialog-actions">
          <button className="btn ghost" onClick={() => close(false)}>
            {ask.cancel ?? 'キャンセル'}
          </button>
          <button ref={okRef} className={`btn ${ask.danger ? 'danger' : 'primary'}`} onClick={() => close(true)}>
            {ask.ok}
          </button>
        </div>
      </div>
    </div>
  );
}
