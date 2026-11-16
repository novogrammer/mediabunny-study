import './style.scss'

import {
  Output,
  Mp4OutputFormat,
  BufferTarget,
  CanvasSource,
  Quality,
} from 'mediabunny';


type OnProgress = (progress: number) => void;

interface FrameRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly duration: number;

  renderAsync(time: number): Promise<void>;
}

class VideoExporter {
  private frameRenderer:FrameRenderer;
  private fps:number;
  private output;
  private source;
  private constructor(
    frameRenderer:FrameRenderer,
    fps:number,
  ){
    this.frameRenderer=frameRenderer;
    this.fps=fps;
    this.output = new Output({
      format: new Mp4OutputFormat(),
      target: new BufferTarget(),
    });
    const fullCodecString = fps > 30
      ? 'avc1.420028' // 60fps：level 4.0
      : 'avc1.420020' // 30fps：level 3.2
    this.source = new CanvasSource(this.frameRenderer.canvas, {
      codec: 'avc',
      quality: new Quality('high'),
      fullCodecString,
    });
    this.output.addVideoTrack(this.source, { frameRate: this.fps });

  }
  static async createAsync(frameRenderer:FrameRenderer,fps:number){
    const instance = new VideoExporter(frameRenderer,fps);
    await instance.output.start();

    return instance;
  }
  async renderFrameAsync(time:number){
    await this.frameRenderer.renderAsync(time);
    await this.source.add(time, 1 / this.fps);
  }
  async renderAllFramesAsync(onProgress?:OnProgress) {
    const frameCount = Math.ceil(
      this.fps * this.frameRenderer.duration
    );
    onProgress?.(0);
  
    for (let frame = 0; frame < frameCount; frame++) {
      await this.renderFrameAsync(frame / this.fps);
      onProgress?.((frame + 1) / frameCount);
    }
  }
  async finishAsync(){
    await this.output.finalize();
  
    const blob = new Blob([this.output.target.buffer!], {
      type: 'video/mp4',
    });
  
    return blob;
    
  }
}

class Canvas2DRenderer implements FrameRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly duration = 5;
  private ctx: CanvasRenderingContext2D;

  constructor(
    width: number,
    height: number,
    canvas: HTMLCanvasElement = document.createElement('canvas'),
  ) {
    this.canvas = canvas;
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d')!;
  }

  async renderAsync(time: number) {
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(time * 100, 130, 100, 100);
  }
}


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
