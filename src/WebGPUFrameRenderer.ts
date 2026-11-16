import * as THREE from 'three/webgpu';
import type { FrameRenderer } from './FrameRenderer';

export class WebGPUFrameRenderer implements FrameRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly duration = 5;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGPURenderer;
  private geometry = new THREE.BoxGeometry(1, 1, 1);
  private material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  private cube = new THREE.Mesh(this.geometry, this.material);
  private initPromise?: Promise<THREE.WebGPURenderer>;

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

  async renderAsync(time: number): Promise<void> {
    this.initPromise ??= this.renderer.init();
    await this.initPromise;

    this.cube.rotation.x = time / 2;
    this.cube.rotation.y = time;
    this.renderer.render(this.scene, this.camera);
  }

  async dispose(): Promise<void> {
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
    await this.renderer.dispose();
  }
}

