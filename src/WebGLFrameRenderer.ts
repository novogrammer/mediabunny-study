import * as THREE from 'three';
import type { FrameRenderer } from './FrameRenderer';

export class WebGLFrameRenderer implements FrameRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly duration = 5;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private geometry = new THREE.BoxGeometry(1, 1, 1);
  private material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  private cube = new THREE.Mesh(this.geometry, this.material);

  constructor(
    width: number,
    height: number,
    canvas: HTMLCanvasElement = document.createElement('canvas'),
  ) {
    this.canvas = canvas;
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 5;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(width, height, false);
    this.scene.add(this.cube);
  }

  async renderAsync(time: number) {
    this.cube.rotation.x = time / 2;
    this.cube.rotation.y = time;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}

