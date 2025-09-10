import { MarginConfig } from "@/types";

export class ChartDimensions {
  #margin: MarginConfig;
  #width: number;
  #height: number;

  constructor(svgContainer: SVGSVGElement, margin: MarginConfig) {
    this.#margin = { ...margin };
    this.#width = svgContainer.clientWidth;
    this.#height = svgContainer.clientHeight;
  }

  public get margin(): MarginConfig {
    return { ...this.#margin };
  }

  public get width(): number {
    return this.#width;
  }

  public get height(): number {
    return this.#height;
  }

  public get innerWidth(): number {
    return this.#width - (this.#margin.left + this.#margin.right);
  }

  public get innerHeight(): number {
    return this.#height - (this.#margin.top + this.#margin.bottom);
  }

  public get innerXRange(): [number, number] {
    return [this.margin.left, this.innerWidth + this.margin.left];
  }

  public get innerYRange(): [number, number] {
    return [this.innerHeight + this.margin.top, this.margin.top];
  }

  public updateDimensions(svgContainer: SVGSVGElement): void {
    this.#width = svgContainer.clientWidth;
    this.#height = svgContainer.clientHeight;
  }

  public updateMargin(margin: Partial<MarginConfig>): void {
    this.#margin = { ...this.#margin, ...margin };
  }

  public get areValidDimensions(): boolean {
    return this.innerWidth > 0 && this.innerHeight > 0;
  }
}
