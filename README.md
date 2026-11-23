# mediabunny-study

Mediabunnyでcanvasの描画をMP4に書き出す、LT用のサンプルです。
Canvas 2D・Three.jsのWebGL・WebGPUを切り替えて、プレビューと書き出しを試せます。

## 起動

Node.js 22.12以降の22系を使用します。

```sh
npm ci
npm run dev
```

表示されたURLをブラウザで開き、レンダラーを選んで「Export MP4」を押します。
完了後のリンクからMP4をダウンロードできます。出力は640×360、30fps、5秒、音声なしです。

## テスト・ビルド

```sh
npm test
npm run build
```

## 主なファイル

- `src/FrameRenderer.ts`：描画処理の共通インターフェース
- `src/VideoExporter.ts`：フレームごとの描画とMP4生成
- `src/Canvas2DFrameRenderer.ts`：Canvas 2Dの描画
- `src/WebGLFrameRenderer.ts`：WebGLの描画
- `src/WebGPUFrameRenderer.ts`：WebGPUの描画と初期化
- `src/RenderQueue.ts`：描画要求のキュー管理
- `src/main.ts`：プレビュー・レンダラー切り替え・書き出しUI

## WebGPU版について

描画要求をキューに入れ、`setAnimationLoop`で1件ずつ処理します。
動画の時刻はフレーム番号で決まりますが、書き出し速度は表示ループの頻度に制約されます。
バックグラウンドでは処理が遅くなる場合があります。

WebGPUが利用できない環境では、Three.jsがWebGL 2へフォールバックする場合があります。
MP4書き出しの可否は、ブラウザ・実行環境のWebCodecsとH.264エンコード対応に依存します。
