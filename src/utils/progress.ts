/**
 * Progress Bar Utility
 * Simple terminal progress bar with percentage
 */

export class ProgressBar {
  private total: number;
  private current: number = 0;
  private width: number = 40;
  private label: string;

  constructor(total: number, label: string = "Progress") {
    this.total = total;
    this.label = label;
  }

  update(current: number): void {
    this.current = Math.min(current, this.total);
    this.render();
  }

  increment(): void {
    this.update(this.current + 1);
  }

  private render(): void {
    const percent = (this.current / this.total) * 100;
    const filledWidth = Math.round((this.width * this.current) / this.total);
    const emptyWidth = this.width - filledWidth;

    const filled = "█".repeat(filledWidth);
    const empty = "░".repeat(emptyWidth);

    process.stdout.write(
      `\r${this.label} [${filled}${empty}] ${percent.toFixed(0)}% (${this.current}/${this.total})`
    );
  }

  finish(): void {
    this.current = this.total;
    this.render();
    console.log("");
  }
}
