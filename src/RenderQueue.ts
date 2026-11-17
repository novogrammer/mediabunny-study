interface RenderRequest {
  time: number;
  resolve: () => void;
  reject: (error: unknown) => void;
}

export class RenderQueue {
  private requests: RenderRequest[] = [];
  private disposed = false;

  enqueue(time: number): Promise<void> {
    if (this.disposed) {
      return Promise.reject(new Error('描画キューは破棄されています。'));
    }

    return new Promise<void>((resolve, reject) => {
      this.requests.push({ time, resolve, reject });
    });
  }

  // 描画コールバックは同期処理。GPUの処理完了待ちは担当しない。
  processNext(render: (time: number) => void): void {
    const request = this.requests.shift();
    if (!request) return;

    try {
      render(request.time);
      request.resolve();
    } catch (error) {
      request.reject(error);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const error = new Error('描画が完了する前にキューが破棄されました。');
    for (const request of this.requests.splice(0)) {
      request.reject(error);
    }
  }
}
