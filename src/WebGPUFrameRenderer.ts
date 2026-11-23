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
  private material = new THREE.MeshStandardMaterial({ color: 0x00ff00, roughness: 0.7 });
  private cube = new THREE.Mesh(this.geometry, this.material);
  private orbitMaterial = new THREE.MeshStandardMaterial({ color: 0xffaa44, roughness: 0.7 });
  private orbitCubes = Array.from({ length: 4 }, () =>
    new THREE.Mesh(this.geometry, this.orbitMaterial),
  );
  private floorGeometry = new THREE.PlaneGeometry(20, 20);
  private floorMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 1 });
  private floor = new THREE.Mesh(this.floorGeometry, this.floorMaterial);
  private light = new THREE.DirectionalLight(0xffffff, 3);
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
    this.camera.position.set(0, 1.5, 6);
    this.camera.lookAt(0, 1.5, 0);
    this.renderer = new THREE.WebGPURenderer({ canvas, alpha: false });
    this.renderer.setSize(width, height, false);
    this.scene.background = new THREE.Color(0x000000);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.cube.position.y = 1.5;
    this.cube.castShadow = true;
    this.cube.receiveShadow = true;
    this.scene.add(this.cube);

    for (const cube of this.orbitCubes) {
      cube.visible = false;
      cube.castShadow = true;
      cube.receiveShadow = true;
      this.scene.add(cube);
    }

    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);

    this.light.position.set(0, 10, 0);
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(2048, 2048);
    this.light.shadow.camera.up.set(0, 0, -1);
    this.light.shadow.camera.left = -4;
    this.light.shadow.camera.right = 4;
    this.light.shadow.camera.top = 4;
    this.light.shadow.camera.bottom = -4;
    this.light.shadow.camera.near = 0.1;
    this.light.shadow.camera.far = 15;
    this.light.shadow.normalBias = 0.02;
    this.scene.add(this.light, this.light.target);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  }

  private async initAsync(): Promise<void> {
    await this.renderer.init();
    if (this.disposed) return;
    await this.renderer.setAnimationLoop(() => {
      // Three.jsの内部フレーム更新後に、1表示フレームにつき1件だけ描画する。
      this.renderQueue.processNext((time) => {
        this.cube.rotation.x = time / 2;
        this.cube.rotation.y = time;

        this.orbitCubes.forEach((cube, index) => {
          const angle = (time / this.duration) * Math.PI * 2 + index * Math.PI / 2;
          cube.position.set(Math.cos(angle) * 2, 1.5, Math.sin(angle) * 2);
          cube.rotation.x = time / 2;
          cube.rotation.y = time;

          // 1秒から0.25秒間隔で出現。0秒に戻したときも表示・サイズを再計算する。
          const elapsed = time - (1 + index * 0.25);
          cube.visible = elapsed >= 0;
          const progress = THREE.MathUtils.clamp(elapsed / 0.2, 0, 1);
          const scale = 0.5 * (1 + 0.2 * (1 - progress) ** 3);
          cube.scale.setScalar(scale);
        });

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
    this.orbitMaterial.dispose();
    this.floorGeometry.dispose();
    this.floorMaterial.dispose();
    this.light.dispose();
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

