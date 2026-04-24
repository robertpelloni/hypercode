export type ThrottledTask<T> = () => Promise<T>;

export class RequestQueue {
  private queue: { task: ThrottledTask<any>; resolve: (value: any) => void; reject: (reason?: any) => void }[] = [];
  private processing = false;
  private lastRequestTime = 0;
  private minInterval = 500; // ms between requests

  constructor(minIntervalMs: number = 500) {
    this.minInterval = minIntervalMs;
  }

  async add<T>(task: ThrottledTask<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const elapsed = now - this.lastRequestTime;
      const wait = Math.max(0, this.minInterval - elapsed);

      if (wait > 0) {
        await new Promise(resolve => setTimeout(resolve, wait));
      }

      const item = this.queue.shift();
      if (item) {
        try {
          this.lastRequestTime = Date.now();
          const result = await item.task();
          item.resolve(result);
        } catch (error) {
          item.reject(error);
        }
      }
    }

    this.processing = false;
  }
}

export const globalRequestQueue = new RequestQueue(500);
