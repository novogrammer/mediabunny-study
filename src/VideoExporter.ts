import {
  Output,
  Mp4OutputFormat,
  BufferTarget,
  CanvasSource,
  Quality,
} from 'mediabunny';
import type { FrameRenderer } from './FrameRenderer';

export type OnProgress = (progress: number) => void;

export class VideoExporter {
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
