// 自動化ゲームのデータとロジック（React に依存しない純粋な TS）

export type Resource = { id: string; name: string; icon: string };

export type StepDef = {
  name: string; // 手作業の名前（例: レモンを摘む）
  icon: string;
  input?: string; // 消費する資源 id
  inAmt: number; // 1回あたりの消費量
  output: string; // 生産する資源 id（'money' は売上）
  outAmt: number; // 1回あたりの生産量（売上なら単価）
  time: number; // 手作業 1 回にかかる秒数
  worker: string; // 雇う人の名前
  machine: string; // 機械の名前
  hireBase: number;
  toolBase: number;
  machineCost: number;
};

export type StageDef = {
  name: string;
  icon: string;
  intro: string;
  resources: Resource[];
  steps: StepDef[];
  needWorkers: number; // 機械化に必要な人数
};

export const WORKER_SPEED = 0.5; // 雇った人の速さ（あなたの手作業比）
export const MACHINE_MULT = 4; // 機械化でその工程が何倍速になるか
export const TOOL_MULT = 1.5; // 道具レベル 1 ごとの速度倍率
export const HIRE_GROWTH = 1.17; // 雇うたびに上がる費用の倍率
export const TOOL_GROWTH = 3.2;
export const MAX_TOOL = 5;

type StepSeed = [name: string, icon: string, input: string | undefined, inAmt: number, output: string, outAmt: number, time: number, worker: string, machine: string];

function makeStage(
  name: string,
  icon: string,
  intro: string,
  resources: Resource[],
  seeds: StepSeed[],
  scale: number,
  needWorkers: number,
  incomeRatio: number,
): StageDef {
  const steps = seeds.map(([sName, sIcon, input, inAmt, output, outAmt, time, worker, machine], i): StepDef => {
    const k = Math.pow(1.8, i);
    return {
      name: sName,
      icon: sIcon,
      input,
      inAmt,
      output,
      outAmt,
      time,
      worker,
      machine,
      hireBase: round2(10 * scale * k),
      toolBase: round2(40 * scale * k),
      machineCost: round2(250 * scale * k),
    };
  });
  const def: StageDef = { name, icon, intro, resources, steps, needWorkers };
  // 売値は「最低限の全自動化にかかる費用」を約 1/incomeRatio 秒で回収できる水準に自動で決める
  const sell = steps[steps.length - 1];
  sell.outAmt = 1;
  let clearCost = 0;
  for (const d of steps) {
    for (let w = 0; w < needWorkers; w++) clearCost += Math.ceil(d.hireBase * Math.pow(HIRE_GROWTH, w));
    clearCost += d.machineCost;
  }
  const perYen = flowDef(def, steps.map(() => ({ workers: needWorkers, tool: 0, machine: true }))).income;
  sell.outAmt = round2((clearCost * incomeRatio) / perYen);
  return def;
}

/** 費用を見やすい数字に丸める（有効数字 2 桁） */
function round2(n: number): number {
  if (n < 100) return Math.round(n);
  const p = Math.pow(10, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / p) * p;
}

// 各ステージの費用の規模
const SCALE = [1, 1000, 5e6, 5e10, 7e14];

const RATIO = [0.03, 0.02, 0.012, 0.006, 0.004];

export const STAGES: StageDef[] = [
  makeStage(
    'レモネード屋台',
    '🍋',
    '公園のすみっこで、ひとりきりのレモネード屋台を始めました。まずは自分の手でレモンを摘んで、しぼって、売りましょう。',
    [
      { id: 'lemon', name: 'レモン', icon: '🍋' },
      { id: 'lemonade', name: 'レモネード', icon: '🥤' },
    ],
    [
      ['レモンを摘む', '🧺', undefined, 0, 'lemon', 1, 1.0, '摘み手', '自動収穫アーム'],
      ['しぼる', '🍹', 'lemon', 2, 'lemonade', 1, 1.5, 'しぼり係', 'ジューサー'],
      ['売る', '🪙', 'lemonade', 1, 'money', 0, 1.0, '売り子', '自動販売機'],
    ],
    SCALE[0],
    5,
    RATIO[0],
  ),
  makeStage(
    '町のパン屋',
    '🍞',
    '屋台は勝手に回るようになりました。次は町に小さなパン屋を開きます。小麦を育てるところから、またあなたの手作業です。',
    [
      { id: 'wheat', name: '小麦', icon: '🌾' },
      { id: 'flour', name: '小麦粉', icon: '🥡' },
      { id: 'bread', name: 'パン', icon: '🍞' },
    ],
    [
      ['小麦を刈る', '🌾', undefined, 0, 'wheat', 1, 1.0, '農家', 'コンバイン'],
      ['粉をひく', '⚙️', 'wheat', 2, 'flour', 1, 1.5, '粉ひき職人', '製粉機'],
      ['パンを焼く', '🔥', 'flour', 1, 'bread', 2, 2.0, 'パン職人', 'オーブンライン'],
      ['売る', '🪙', 'bread', 1, 'money', 0, 1.0, '店員', 'セルフレジ'],
    ],
    SCALE[1],
    5,
    RATIO[1],
  ),
  makeStage(
    '家具工房',
    '🪑',
    'パン屋はもう誰も指示しなくても焼き上がります。今度は森のそばに家具工房を構えました。',
    [
      { id: 'log', name: '丸太', icon: '🪵' },
      { id: 'board', name: '板', icon: '🟫' },
      { id: 'chair', name: '椅子', icon: '🪑' },
      { id: 'painted', name: '塗装済み椅子', icon: '✨' },
    ],
    [
      ['木を切る', '🪓', undefined, 0, 'log', 1, 1.2, 'きこり', '伐採ロボ'],
      ['製材する', '🪚', 'log', 1, 'board', 2, 1.5, '製材工', '製材ライン'],
      ['組み立てる', '🔨', 'board', 4, 'chair', 1, 2.0, '家具職人', '組立ロボ'],
      ['塗装する', '🖌️', 'chair', 1, 'painted', 1, 1.5, '塗装工', '塗装ブース'],
      ['出荷する', '🚚', 'painted', 1, 'money', 0, 1.0, '配送員', '自動倉庫'],
    ],
    SCALE[2],
    6,
    RATIO[2],
  ),
  makeStage(
    '自動車工場',
    '🚗',
    '工房は木を切るところから出荷まで、ひとりでに動いています。いよいよ自動車づくりに挑戦です。',
    [
      { id: 'ore', name: '鉄鉱石', icon: '🪨' },
      { id: 'steel', name: '鋼材', icon: '🔩' },
      { id: 'part', name: '部品', icon: '⚙️' },
      { id: 'car', name: '車体', icon: '🚙' },
      { id: 'checked', name: '検査済みの車', icon: '🚗' },
    ],
    [
      ['鉄鉱石を掘る', '⛏️', undefined, 0, 'ore', 1, 1.2, '鉱員', '自動掘削機'],
      ['製鉄する', '🔥', 'ore', 2, 'steel', 1, 1.5, '製鉄工', '電炉'],
      ['部品をつくる', '🛠️', 'steel', 1, 'part', 2, 1.5, '機械工', 'CNC旋盤'],
      ['組み立てる', '🔧', 'part', 6, 'car', 1, 2.5, '組立工', '溶接ロボ'],
      ['検査する', '🔍', 'car', 1, 'checked', 1, 1.5, '検査員', 'AI検査装置'],
      ['販売する', '🪙', 'checked', 1, 'money', 0, 1.0, '営業', 'オンライン販売'],
    ],
    SCALE[3],
    6,
    RATIO[3],
  ),
  makeStage(
    'ロケット基地',
    '🚀',
    '自動車工場もすっかり無人で回っています。最後の夢、宇宙へ。ロケットを自動で打ち上げ続ける基地をつくりましょう。',
    [
      { id: 'fuel', name: '燃料', icon: '🛢️' },
      { id: 'alloy', name: '特殊合金', icon: '🧪' },
      { id: 'engine', name: 'エンジン', icon: '🔥' },
      { id: 'chip', name: '制御チップ', icon: '💾' },
      { id: 'rocket', name: 'ロケット', icon: '🚀' },
    ],
    [
      ['燃料を精製する', '🛢️', undefined, 0, 'fuel', 1, 1.2, '精製技師', '精製プラント'],
      ['合金をつくる', '🧪', 'fuel', 2, 'alloy', 1, 1.5, '冶金技師', '真空炉'],
      ['エンジンを組む', '🔥', 'alloy', 3, 'engine', 1, 2.0, 'エンジン技師', 'エンジン工場'],
      ['チップを積む', '💾', 'engine', 1, 'chip', 1, 1.5, 'プログラマ', '自動書込装置'],
      ['ロケットを組む', '🔧', 'chip', 4, 'rocket', 1, 3.0, '整備士', '巨大組立棟'],
      ['打ち上げる', '🛰️', 'rocket', 1, 'money', 0, 1.0, '管制官', '自動管制AI'],
    ],
    SCALE[4],
    7,
    RATIO[4],
  ),
];

export type StepState = { workers: number; tool: number; machine: boolean };

export type Completed = { stage: number; rate: number; time: number };

export type GameState = {
  version: 1;
  money: number;
  totalEarned: number;
  stage: number;
  inv: Record<string, number>;
  steps: StepState[];
  manual: { step: number; t: number } | null;
  manualCount: number;
  completed: Completed[];
  stageTime: number; // 現ステージでの経過秒
  playTime: number;
  cleared: boolean; // 現ステージが全自動化済み（次へ進む前）
  finished: boolean; // 全ステージクリア
  lastSave: number;
};

export function newStageState(stage: number): Pick<GameState, 'inv' | 'steps' | 'manual' | 'stageTime' | 'cleared'> {
  const def = STAGES[stage];
  const inv: Record<string, number> = {};
  for (const r of def.resources) inv[r.id] = 0;
  return {
    inv,
    steps: def.steps.map(() => ({ workers: 0, tool: 0, machine: false })),
    manual: null,
    stageTime: 0,
    cleared: false,
  };
}

export function newGame(): GameState {
  return {
    version: 1,
    money: 0,
    totalEarned: 0,
    stage: 0,
    manualCount: 0,
    completed: [],
    playTime: 0,
    finished: false,
    lastSave: Date.now(),
    ...newStageState(0),
  };
}

// ---------- 計算 ----------

export function toolMult(s: StepState): number {
  return Math.pow(TOOL_MULT, s.tool);
}

/** 雇った人と機械による、その工程の 1 秒あたりの処理回数 */
export function autoRate(def: StepDef, s: StepState): number {
  return ((s.workers * WORKER_SPEED) / def.time) * toolMult(s) * (s.machine ? MACHINE_MULT : 1);
}

/** 手作業 1 回の所要秒 */
export const manualTime = (def: StepDef, s: StepState) => def.time / toolMult(s);

export const hireCost = (def: StepDef, s: StepState) => Math.ceil(def.hireBase * Math.pow(HIRE_GROWTH, s.workers));
export const toolCost = (def: StepDef, s: StepState) => Math.ceil(def.toolBase * Math.pow(TOOL_GROWTH, s.tool));

/** 原料の供給を考慮した、各工程の実際の処理回数/秒と最終的な売上/秒 */
export function flow(stage: number, steps: StepState[]) {
  return flowDef(STAGES[stage], steps);
}

function flowDef(def: StageDef, steps: StepState[]): { ops: number[]; income: number; bottleneck: number } {
  const ops: number[] = [];
  let avail = Infinity;
  let bottleneck = -1;
  let worst = Infinity;
  def.steps.forEach((d, i) => {
    const cap = autoRate(d, steps[i]);
    const fromInput = d.input ? avail / d.inAmt : Infinity;
    const o = Math.min(cap, fromInput);
    ops.push(o);
    // ボトルネック：最終出力換算で最も能力が低い工程
    const cf = conversionToEnd(def, i);
    if (cap * cf < worst) {
      worst = cap * cf;
      bottleneck = i;
    }
    avail = o * d.outAmt;
  });
  return { ops, income: avail, bottleneck };
}

/** 工程 i を 1 回動かすと最終的に何円になるか */
function conversionToEnd(def: StageDef, i: number): number {
  let v = def.steps[i].outAmt;
  for (let j = i + 1; j < def.steps.length; j++) v = (v / def.steps[j].inAmt) * def.steps[j].outAmt;
  return v;
}

export const passiveIncome = (g: GameState) => g.completed.reduce((a, c) => a + c.rate, 0);

export const allMachines = (g: GameState) => g.steps.every((s) => s.machine);

export function canStartManual(g: GameState, i: number): boolean {
  if (g.manual) return false;
  const d = STAGES[g.stage].steps[i];
  return !d.input || g.inv[d.input] >= d.inAmt;
}

// ---------- 状態更新（ミュータブルに更新し、呼び出し側でコピーする） ----------

export type Events = { earned: number; manualDone: number | null };

function produce(g: GameState, d: StepDef, n: number, ev: Events) {
  if (d.output === 'money') {
    const m = n * d.outAmt;
    g.money += m;
    g.totalEarned += m;
    ev.earned += m;
  } else {
    g.inv[d.output] += n * d.outAmt;
  }
}

export function tick(g: GameState, dt: number, ev: Events = { earned: 0, manualDone: null }): Events {
  const def = STAGES[g.stage];
  g.playTime += dt;
  if (!g.finished) g.stageTime += dt;

  // 過去ステージの施設からの収入
  const p = passiveIncome(g) * dt;
  if (p > 0) {
    g.money += p;
    g.totalEarned += p;
    ev.earned += p;
  }
  if (g.finished) return ev;

  // あなたの手作業
  if (g.manual) {
    const d = def.steps[g.manual.step];
    g.manual.t += dt;
    if (g.manual.t >= manualTime(d, g.steps[g.manual.step])) {
      produce(g, d, 1, ev);
      ev.manualDone = g.manual.step;
      g.manualCount++;
      g.manual = null;
    }
  }

  // 雇った人・機械
  def.steps.forEach((d, i) => {
    const s = g.steps[i];
    if (s.workers === 0) return;
    let n = autoRate(d, s) * dt;
    if (d.input) {
      n = Math.min(n, g.inv[d.input] / d.inAmt);
      g.inv[d.input] -= n * d.inAmt;
      if (g.inv[d.input] < 1e-9) g.inv[d.input] = 0;
    }
    if (n > 0) produce(g, d, n, ev);
  });
  return ev;
}

export function startManual(g: GameState, i: number): boolean {
  if (!canStartManual(g, i)) return false;
  const d = STAGES[g.stage].steps[i];
  if (d.input) g.inv[d.input] -= d.inAmt;
  g.manual = { step: i, t: 0 };
  return true;
}

export function hire(g: GameState, i: number): boolean {
  const d = STAGES[g.stage].steps[i];
  const s = g.steps[i];
  const c = hireCost(d, s);
  if (g.money < c) return false;
  g.money -= c;
  s.workers++;
  return true;
}

export function upgradeTool(g: GameState, i: number): boolean {
  const d = STAGES[g.stage].steps[i];
  const s = g.steps[i];
  const c = toolCost(d, s);
  if (s.tool >= MAX_TOOL || g.money < c) return false;
  g.money -= c;
  s.tool++;
  return true;
}

export function buyMachine(g: GameState, i: number): boolean {
  const d = STAGES[g.stage].steps[i];
  const s = g.steps[i];
  const need = STAGES[g.stage].needWorkers;
  if (s.machine || s.workers < need || g.money < d.machineCost) return false;
  g.money -= d.machineCost;
  s.machine = true;
  if (allMachines(g)) g.cleared = true;
  return true;
}

/** 全自動化したステージを施設として登録し、次のステージへ（所持金はそのまま） */
export function nextStage(g: GameState): void {
  if (!g.cleared) return;
  const rate = flow(g.stage, g.steps).income;
  g.completed.push({ stage: g.stage, rate, time: g.stageTime });
  if (g.stage + 1 >= STAGES.length) {
    g.finished = true;
    g.cleared = false;
    g.manual = null;
    return;
  }
  g.stage++;
  Object.assign(g, newStageState(g.stage));
}

// ---------- 表示用 ----------

const UNITS: [number, string][] = [
  [1e20, '垓'],
  [1e16, '京'],
  [1e12, '兆'],
  [1e8, '億'],
  [1e4, '万'],
];

export function fmt(n: number): string {
  if (!isFinite(n)) return '∞';
  const neg = n < 0;
  n = Math.abs(n);
  let s: string;
  const u = UNITS.find(([v]) => n >= v);
  if (u) {
    const x = n / u[0];
    s = (x >= 1000 ? Math.floor(x).toLocaleString('ja-JP') : x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2)) + u[1];
  } else if (n >= 100 || Number.isInteger(n)) s = Math.floor(n).toLocaleString('ja-JP');
  else s = n.toFixed(n >= 10 ? 1 : 2);
  return (neg ? '-' : '') + s;
}

export const yen = (n: number) => '¥' + fmt(n);

export function fmtTime(sec: number): string {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}時間${m}分` : m > 0 ? `${m}分${String(s).padStart(2, '0')}秒` : `${s}秒`;
}
