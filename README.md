# ぜんぶ自動化

手作業から始めて、最後はあなたが何もしなくても回る工場をつくる放置系ゲームです。

## 遊び方

- 最初は「自分でやる」ボタンで、材料集め → 加工 → 販売をあなたがひとつずつ手作業で行います（一度にできる作業はひとつだけ）
- 稼いだお金で人を雇うと、その工程を自動でこなしてくれます（あなたより遅め）。道具の改良で速度アップ
- 1工程に一定人数を雇うと「機械化」でき（4倍速）、全工程を機械化すると**全自動化達成**
- 全自動化した施設はその後もずっと稼ぎ続け、**所持金はそのまま**次のステージへ
- ステージ：レモネード屋台 → 町のパン屋 → 家具工房 → 自動車工場 → ロケット基地（目安 30 分前後）
- 進行は localStorage に自動保存。閉じている間（最大 8 時間）も稼働します。キーボード `1`〜`6` で手作業

## 開発

```sh
npm install
npm run dev      # 開発サーバー
npm run build    # dist/ に本番ビルド
```

- `src/model.ts`：ステージ・数値・進行ロジック（React に依存しない）
- `src/main.tsx`：画面
- `src/game.css`：スタイル（ダークモード対応）

バランスは `src/model.ts` の `SCALE`（ステージごとの費用の規模）と `RATIO`（稼ぎやすさ）、`WORKER_SPEED` / `MACHINE_MULT` / `HIRE_GROWTH` などで調整できます。

## 公開

`main`（または `claude/site-quiz-feature-g2h7nm`）ブランチに push すると GitHub Actions（`.github/workflows/deploy.yml`）で GitHub Pages にデプロイされます。
初回のみリポジトリの Settings → Pages → Source を「GitHub Actions」にしてください。
