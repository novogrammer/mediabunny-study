import type { FrameRenderer } from './FrameRenderer';

export class Canvas2DRenderer implements FrameRenderer {
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
