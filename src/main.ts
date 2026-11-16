import './style.scss'

import { Canvas2DFrameRenderer } from './Canvas2DFrameRenderer';
import { WebGLFrameRenderer } from './WebGLFrameRenderer';
import type { FrameRenderer } from './FrameRenderer';
import { VideoExporter } from './VideoExporter';
import type { OnProgress } from './VideoExporter';

function createFrameRenderer(type: string, canvas?: HTMLCanvasElement): FrameRenderer {
  return type === 'webgl'
    ? new WebGLFrameRenderer(640, 360, canvas)
    : new Canvas2DFrameRenderer(640, 360, canvas);
}

function setupPreview(rendererSelect: HTMLSelectElement){
  // 2DとWebGLのコンテキストは同じcanvasで切り替えられないため、別々に用意する。
  const canvas2D = document.querySelector<HTMLCanvasElement>('#preview')!;
  const webglCanvas = document.querySelector<HTMLCanvasElement>('#webgl-preview')!;
  const renderers = new Map<string, FrameRenderer>();
  let previewRenderer: FrameRenderer;
  let startTime = performance.now();

  function switchRenderer() {
    const type = rendererSelect.value;
    const canvas = type === 'webgl' ? webglCanvas : canvas2D;
    let renderer = renderers.get(type);
    if (!renderer) {
      renderer = createFrameRenderer(type, canvas);
      renderers.set(type, renderer);
    }
    previewRenderer = renderer;
    canvas2D.hidden = type === 'webgl';
    webglCanvas.hidden = type !== 'webgl';
    startTime = performance.now();
  }

  switchRenderer();
  rendererSelect.addEventListener('change', switchRenderer);
  
  async function animateAsync() {
    const time = ((performance.now() - startTime) / 1000) % previewRenderer.duration;
  
    await previewRenderer.renderAsync(time);
    requestAnimationFrame(animateAsync);
  }
  
  requestAnimationFrame(animateAsync);
}


async function exportMp4Async(rendererType: string, onProgress?: OnProgress) {
  const fps = 30;

  const frameRenderer = createFrameRenderer(rendererType);
  try {
    const videoExporter = await VideoExporter.createAsync(frameRenderer,fps);
    await videoExporter.renderAllFramesAsync(onProgress);
    return await videoExporter.finishAsync();
  } finally {
    frameRenderer.dispose?.();
  }

}

function setupExport(rendererSelect: HTMLSelectElement){
  const button = document.querySelector<HTMLButtonElement>('#export-button')!;
  const progressElement = document.querySelector<HTMLProgressElement>('#export-progress')!;
  const downloadLink = document.querySelector<HTMLAnchorElement>('#download-link')!;
  
  let downloadUrl: string | null = null;
  
  button.addEventListener('click', async () => {
    button.disabled = true;
    rendererSelect.disabled = true;
    progressElement.value = 0;
  
    try {
      const blob = await exportMp4Async(rendererSelect.value, (progress) => {
        progressElement.value = progress;
      });
  
      // 前回のURLを解放
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
  
      // ダウンロードリンクを更新
      downloadUrl = URL.createObjectURL(blob);
      downloadLink.href = downloadUrl;
      downloadLink.hidden = false;
    } catch (error) {
      console.error(error);
    } finally {
      button.disabled = false;
      rendererSelect.disabled = false;
    }
  });
  
}

async function mainAsync(){
  const rendererSelect = document.querySelector<HTMLSelectElement>('#renderer-select')!;
  setupPreview(rendererSelect);
  setupExport(rendererSelect);
  
}


mainAsync();
