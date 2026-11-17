import * as THREE from 'three/webgpu';
import type { FrameRenderer } from './FrameRenderer';
import { RenderQueue } from './RenderQueue';

export class WebGPUFrameRenderer implements FrameRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly duration = 5;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGPURenderer;
  private geometry = new THREE.BoxGeometry(1, 1, 1);
  private material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  private cube = new THREE.Mesh(this.geometry, this.material);
  private initPromise?: Promise<void>;
  private renderQueue = new RenderQueue();
  private disposed = false;

  constructor(
    width: number,
    height: number,
    canvas: HTMLCanvasElement = document.createElement('canvas'),
  ) {
    this.canvas = canvas;
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 5;
    this.renderer = new THREE.WebGPURenderer({ canvas });
    this.renderer.setSize(width, height, false);
    this.scene.add(this.cube);
  }

  private async initAsync(): Promise<void> {
    await this.renderer.init();
    if (this.disposed) return;
    await this.renderer.setAnimationLoop(() => {
      // Three.jsの内部フレーム更新後に、1表示フレームにつき1件だけ描画する。
      this.renderQueue.processNext((time) => {
        this.cube.rotation.x = time / 2;
        this.cube.rotation.y = time;
        this.renderer.render(this.scene, this.camera);
      });
    });
  }

  async renderAsync(time: number): Promise<void> {
    if (this.disposed) throw new Error('レンダラーは破棄されています。');
    this.initPromise ??= this.initAsync();
    await this.initPromise;
    if (this.disposed) throw new Error('レンダラーは破棄されています。');

    return this.renderQueue.enqueue(time);
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.renderQueue.dispose();

    this.geometry.dispose();
    this.material.dispose();
    if (this.initPromise) {
      try {
        await this.initPromise;
      } catch {
        // 初期化失敗時はThree.js側のdisposeも同じPromiseで失敗する。
        return;
      }
    }
    if (this.renderer.initialized) {
      await this.renderer.setAnimationLoop(null);
    }
    await this.renderer.dispose();
  }
}

