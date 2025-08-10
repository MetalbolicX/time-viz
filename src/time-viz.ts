import { LitElement, html, css } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { select, scaleOrdinal, schemeCategory10, style } from "d3";
import type {
  TimeVizConfig,
  TimeVizSeriesConfig,
  ChartDataRow,
  MarginConfig,
} from "./types";
import { createTimeVizChart } from "./d3-time-viz";
import "tipviz";
import { TipVizTooltip } from "tipviz";

@customElement("time-viz")
export class TimeViz extends LitElement {
  public static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        sans-serif;
    }

    section {
      display: flex;
      flex-direction: column;
      height: 100%;
      gap: 1rem;
      padding: 1rem;
      box-sizing: border-box;
    }

    .controls {
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }

    select {
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: white;
      font-size: 14px;
    }

    figure {
      flex: 1;
      margin: 0;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    svg {
      width: 100%;
      height: 100%;
      border: 1px solid #e0e0e0;
      background: white;
    }

    button {
      padding: 0.5rem 1rem;
      border: 1px solid #007acc;
      border-radius: 4px;
      background: #007acc;
      color: white;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s;
    }

    button:hover {
      background: #005a9e;
    }

    button:disabled {
      background: #ccc;
      border-color: #ccc;
      cursor: not-allowed;
    }

    .chart-title {
      text-align: center;
      margin: 0 0 1rem 0;
      font-size: 1.2rem;
      font-weight: 600;
    }

    .axis {
      font-size: 0.7em;
    }

    .grid {
      stroke: #e0e0e0;
      stroke-width: 1;
      stroke-dasharray: 2, 2;
    }

    .grid path {
      stroke-width: 0;
    }

    .series {
      opacity: 0.6;
      transition: opacity 0.3s;

      .serie {
        fill: none;
        stroke-width: 2;

        &:hover {
          opacity: 1;
          stroke-width: 4;
        }
      }

      &:has(.serie:hover) .serie:not(:hover) {
        opacity: 0.3;
      }
    }


    .cursor.hidden {
      visibility: hidden;
    }

    .cursor-line {
      stroke: #666;
      stroke-width: 1;
      stroke-dasharray: 3, 3;
      pointer-events: none;
    }

    .cursor-point {
      fill: white;
      stroke-width: 2;
    }

    .legend {
      font-size: 0.75em;

      .legend-square {
        width: 1.5em;
        height: 1.5em;
        display: inline-block;
        margin-right: 0.5rem;
      }
    }

    .legend-item.hidden {
      opacity: 0.3;
    }

    .axis-label {
      font-size: 0.8em;
      text-anchor: middle;
    }
  `;

  @property({ type: Boolean, attribute: "is-static" })
  declare isStatic: boolean;

  @property({ type: Number, attribute: "transition-time" })
  declare transitionTime: number;

  @property({ type: Boolean, attribute: "is-curved" })
  declare isCurved: boolean;

  @property({ type: Object })
  declare margin: MarginConfig;

  @property({ type: Number, attribute: "x-ticks" })
  declare xTicks: number;

  @property({ type: Number, attribute: "y-ticks" })
  declare yTicks: number;

  @property({ type: String, attribute: "format-x-axis" })
  declare formatXAxis: string;

  @property({ type: String, attribute: "format-y-axis" })
  declare formatYAxis: string;

  @property({ type: String, attribute: "y-axis-label" })
  declare yAxisLabel: string;

  @property({ type: String, attribute: "x-axis-label" })
  declare xAxisLabel: string;

  @state()
  private declare _config: TimeVizConfig;
  @state()
  private declare _data: ChartDataRow[];
  @state()
  private declare _selectedSeries: string;
  @state()
  private declare _hiddenSeries: Set<string>;

  #svgRef = createRef<SVGElement>();
  #colorScale = scaleOrdinal(schemeCategory10);
  @query("#d3-tooltip")
  private declare _tooltip: TipVizTooltip;

  constructor() {
    super();
    this.isStatic = false;
    this.transitionTime = 0;
    this.isCurved = false;
    this.margin = { top: 40, right: 80, bottom: 60, left: 60 };
    this.xTicks = 5;
    this.yTicks = 5;
    this.formatXAxis = "%Y-%m-%d";
    this.formatYAxis = ".2f";
    this._data = [];
    this._selectedSeries = "All";
    this._hiddenSeries = new Set<string>();
    this._config = {
      data: [],
      xSerie: { accessor: (d: ChartDataRow) => d.date as Date },
      ySeries: [],
    };
    this.yAxisLabel = "";
    this.xAxisLabel = "";
  }

  public set config(cfg: TimeVizConfig) {
    this._config = cfg;
    this._data = [...cfg.data];
    this._selectedSeries = "All";
    this._hiddenSeries = new Set<string>();
    this.requestUpdate();
  }

  public get ySeriesLabels(): string[] {
    if (!this._config?.ySeries?.length) return [];
    return this._config.ySeries.map(({ label }) => label);
  }

  public get filteredSeries(): TimeVizSeriesConfig[] {
    if (!this._config?.ySeries?.length) return [];
    if (this._selectedSeries === "All") {
      return this._config.ySeries.filter(
        ({ label }) => !this._hiddenSeries.has(label)
      );
    }
    return this._config.ySeries.filter(
      ({ label }) =>
        label === this._selectedSeries && !this._hiddenSeries.has(label)
    );
  }

  /**
   * Sets the content of the tooltip.
   * @param content - A function that returns the HTML content for the tooltip.
   * @example
   * ```ts
   * tooltipContent((d) => `<strong>${d.x}</strong>: ${d.y}`);
   * ```
   */
  public tooltipContent(content: (...args: any[]) => string): void {
    this._tooltip.setHtml(content);
  }

  /**
   * Sets the styles for the tooltip.
   * @param css - A string containing the CSS styles to apply.
   * @returns {void}
   * @example
   * ```ts
   * tooltipStyle(`
   *   .tooltip {
   *     background-color: black;
   *     color: white;
   *   }
   * `);
   * ```
   */
  public tooltipStyle(css: string): void {
    if (!css) return;
    this._tooltip.setStyles(css);
  }

  protected updated(
    changedProperties: Map<string | number | symbol, unknown>
  ): void {
    if (
      changedProperties.has("_data") ||
      changedProperties.has("_selectedSeries") ||
      changedProperties.has("_hiddenSeries") ||
      changedProperties.has("_config")
    ) {
      this.#renderChart();
    }
  }

  #handleSeriesChange = (event: Event): void => {
    const target = event.target as HTMLSelectElement;
    this._selectedSeries = target.value;
  };

  #handleExport = (): void => {
    if (!this.#svgRef.value) return;

    const svgElement = this.#svgRef.value;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);

    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `time-chart-${new Date().toISOString().split("T")[0]}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  #renderChart(): void {
    if (
      !this.#svgRef.value ||
      !this._data.length ||
      !this._config.ySeries.length
    )
      return;
    const chart = createTimeVizChart()
      .colorScale(this.#colorScale)
      .data(this._data)
      .formatXAxis(this.formatXAxis)
      .formatYAxis(this.formatYAxis)
      .isCurved(this.isCurved)
      .isStatic(this.isStatic)
      .margin(this.margin)
      .series(this.filteredSeries)
      .tooltip(this._tooltip)
      .transitionTime(this.transitionTime)
      .xAxisLabel(this.xAxisLabel)
      .xSerie(this._config.xSerie.accessor)
      .xTicks(this.xTicks)
      .yAxisLabel(this.yAxisLabel)
      .yTicks(this.yTicks);

    select(this.#svgRef.value).call(chart);
  }

  public render() {
    const seriesLabels = this.ySeriesLabels;
    const hasData = this._data.length > 0 && this._config.ySeries.length > 0;

    return html`
      <section>
        <div class="controls">
          <select
            @change=${this.#handleSeriesChange}
            .value=${this._selectedSeries}
            ?disabled=${!hasData}
          >
            <option value="All">All Series</option>
            ${seriesLabels.map(
              (label) => html`<option value=${label}>${label}</option>`
            )}
          </select>

          <button
            @click=${this.#handleExport}
            ?disabled=${!hasData}
            type="button"
          >
            Export SVG
          </button>
        </div>

        <figure>
          <slot name="chart-title" class="chart-title"></slot>
          <svg
            ${ref(this.#svgRef)}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Time Series Chart"
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xlink="http://www.w3.org/1999/xlink"
          ></svg>
        </figure>
        <tip-viz-tooltip id="d3-tooltip" transition-time="250"></tip-viz-tooltip>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "time-viz": TimeViz;
  }
}
