import './style.scss'

import { Canvas2DFrameRenderer } from './Canvas2DFrameRenderer';
import { WebGLFrameRenderer } from './WebGLFrameRenderer';
import { WebGPUFrameRenderer } from './WebGPUFrameRenderer';
import type { FrameRenderer } from './FrameRenderer';
import { VideoExporter } from './VideoExporter';
import type { OnProgress } from './VideoExporter';

function createFrameRenderer(type: string): FrameRenderer {
  switch (type) {
    case 'webgpu':
      return new WebGPUFrameRenderer(640, 360);
    case 'webgl':
      return new WebGLFrameRenderer(640, 360);
    default:
      return new Canvas2DFrameRenderer(640, 360);
  }
}

function setupPreview(rendererSelect: HTMLSelectElement){
  const previewElement = document.querySelector<HTMLDivElement>('#preview')!;
  const errorElement = document.querySelector<HTMLParagraphElement>('#preview-error')!;
  const renderers = new Map<string, FrameRenderer>();
  let previewRenderer: FrameRenderer | undefined;
  let previewType = '';
  let startTime = performance.now();

  function showError(error: unknown) {
    console.error(error);
    errorElement.textContent = `プレビューを表示できませんでした: ${error instanceof Error ? error.message : String(error)}`;
    errorElement.hidden = false;
  }

  function switchRenderer() {
    const type = rendererSelect.value;
    try {
      let renderer = renderers.get(type);
      if (!renderer) {
        renderer = createFrameRenderer(type);
        renderers.set(type, renderer);
      }
      previewRenderer = renderer;
      previewType = type;
      previewElement.replaceChildren(renderer.canvas);
      errorElement.hidden = true;
      startTime = performance.now();
    } catch (error) {
      previewRenderer = undefined;
      previewElement.replaceChildren();
      showError(error);
    }
  }

  switchRenderer();
  rendererSelect.addEventListener('change', switchRenderer);
  
  async function animateAsync() {
    const renderer = previewRenderer;
    const type = previewType;
    try {
      if (renderer) {
        const time = ((performance.now() - startTime) / 1000) % renderer.duration;
        await renderer.renderAsync(time);
      }
    } catch (error) {
      // 失敗したインスタンスは破棄し、再選択時に作り直す。
      renderers.delete(type);
      if (previewRenderer === renderer) {
        previewRenderer = undefined;
        previewElement.replaceChildren();
        showError(error);
      } else {
        console.error(error);
      }
      try {
        await renderer?.dispose?.();
      } catch (disposeError) {
        console.error(disposeError);
      }
    } finally {
      requestAnimationFrame(animateAsync);
    }
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
    await frameRenderer.dispose?.();
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
