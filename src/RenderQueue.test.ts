import { describe, expect, it, vi } from 'vitest';
import { RenderQueue } from './RenderQueue';

describe('RenderQueue', () => {
  it('描画するまでPromiseを完了せず、描画が戻った後に完了する', async () => {
    const queue = new RenderQueue();
    const events: string[] = [];
    const completion = queue.enqueue(1.25).then(() => events.push('resolved'));

    await Promise.resolve();
    expect(events).toEqual([]);

    queue.processNext((time) => {
      expect(time).toBe(1.25);
      expect(events).toEqual([]);
      events.push('rendered');
    });

    await completion;
    expect(events).toEqual(['rendered', 'resolved']);
  });

  it('時刻の大小に関係なくFIFO順で、1回につき1件だけ処理する', async () => {
    const queue = new RenderQueue();
    const render = vi.fn();
    const resolved: number[] = [];
    const completions = [2, 0, 1].map((time) =>
      queue.enqueue(time).then(() => resolved.push(time)),
    );

    for (const [index, time] of [2, 0, 1].entries()) {
      queue.processNext(render);
      await completions[index];
      expect(render).toHaveBeenCalledTimes(index + 1);
      expect(render).toHaveBeenNthCalledWith(index + 1, time);
      expect(resolved).toEqual([2, 0, 1].slice(0, index + 1));
    }
  });

  it('空のキューでは描画を呼ばない', () => {
    const queue = new RenderQueue();
    const render = vi.fn();

    queue.processNext(render);

    expect(render).not.toHaveBeenCalled();
  });

  it('描画中に追加された要求は次の処理まで待つ', async () => {
    const queue = new RenderQueue();
    const first = queue.enqueue(0);
    let second: Promise<void>;
    const render = vi.fn(() => {
      second = queue.enqueue(1);
    });

    queue.processNext(render);
    await first;
    expect(render).toHaveBeenCalledTimes(1);

    const nextRender = vi.fn();
    queue.processNext(nextRender);
    await second!;
    expect(nextRender).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('描画例外を該当要求へ通知し、後続要求は引き続き処理できる', async () => {
    const queue = new RenderQueue();
    const error = new Error('render failed');
    const first = expect(queue.enqueue(0)).rejects.toBe(error);
    const second = queue.enqueue(1);

    expect(() => queue.processNext(() => { throw error; })).not.toThrow();
    await first;

    const render = vi.fn();
    queue.processNext(render);
    await expect(second).resolves.toBeUndefined();
    expect(render).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('破棄時に待機中の全要求を拒否し、その後は描画しない', async () => {
    const queue = new RenderQueue();
    const first = expect(queue.enqueue(0)).rejects.toThrow('キューが破棄');
    const second = expect(queue.enqueue(1)).rejects.toThrow('キューが破棄');

    queue.dispose();
    await Promise.all([first, second]);

    const render = vi.fn();
    queue.processNext(render);
    expect(render).not.toHaveBeenCalled();
  });

  it('処理済みの要求は破棄しても成功のままになる', async () => {
    const queue = new RenderQueue();
    const completion = queue.enqueue(0);
    queue.processNext(() => {});

    queue.dispose();

    await expect(completion).resolves.toBeUndefined();
  });

  it('空のキューを繰り返し破棄でき、破棄後の新規要求は拒否する', async () => {
    const queue = new RenderQueue();

    queue.dispose();
    expect(() => queue.dispose()).not.toThrow();

    await expect(queue.enqueue(0)).rejects.toThrow('キューは破棄');
    const render = vi.fn();
    queue.processNext(render);
    expect(render).not.toHaveBeenCalled();
  });
});
