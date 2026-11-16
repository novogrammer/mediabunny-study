export interface FrameRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly duration: number;

  renderAsync(time: number): Promise<void>;
}
