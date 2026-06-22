export class FlowDetector {
  constructor() {
    this.timestamps = [];
    this.windowMs = 5 * 60 * 1000;
  }

  recordMessage() {
    const now = Date.now();
    this.timestamps.push(now);
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);
  }

  isInFlow() {
    if (this.timestamps.length < 3) return false;
    const gaps = [];
    for (let i = 1; i < this.timestamps.length; i++) {
      gaps.push(this.timestamps[i] - this.timestamps[i - 1]);
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    return avgGap < 90_000;
  }
}
