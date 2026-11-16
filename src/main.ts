import './style.scss'

import { Canvas2DRenderer } from './Canvas2DRenderer';
import { VideoExporter } from './VideoExporter';
import type { OnProgress } from './VideoExporter';

function setupPreview(){
  const canvas = document.querySelector<HTMLCanvasElement>('#preview')!;
  const previewRenderer = new Canvas2DRenderer(canvas.width, canvas.height, canvas);
  
  const startTime = performance.now();
  
  async function animateAsync() {
    const time = ((performance.now() - startTime) / 1000) % previewRenderer.duration;
  
    await previewRenderer.renderAsync(time);
    requestAnimationFrame(animateAsync);
  }
  
  requestAnimationFrame(animateAsync);
}


async function exportMp4Async(onProgress?: OnProgress) {
  const fps = 30;

  const canvas2DRenderer = new Canvas2DRenderer(640, 360);
  
  const videoExporter = await VideoExporter.createAsync(canvas2DRenderer,fps);

  await videoExporter.renderAllFramesAsync(onProgress);

  const blob = await videoExporter.finishAsync();

  return blob;

}

function setupExport(){
  const button = document.querySelector<HTMLButtonElement>('#export-button')!;
  const progressElement = document.querySelector<HTMLProgressElement>('#export-progress')!;
  const downloadLink = document.querySelector<HTMLAnchorElement>('#download-link')!;
  
  let downloadUrl: string | null = null;
  
  button.addEventListener('click', async () => {
    button.disabled = true;
    progressElement.value = 0;
  
    try {
      const blob = await exportMp4Async((progress) => {
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
    }
  });
  
}

async function mainAsync(){
  setupPreview();
  setupExport();
  
}


mainAsync();
