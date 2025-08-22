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
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .controls-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .controls-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    select {
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: white;
      font-size: 14px;
    }

    input[type="date"] {
      padding: 0.4rem;
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
      }

      &:has(.serie:hover, .point:hover) .series-group:not(:hover) {
        opacity: 0.3;
      }

      &:has(.serie:hover, .point:hover) .series-group:hover {
        opacity: 1;

        .serie {
          stroke-width: 4;
        }
      }
    }

    .cursor {

      &.hidden {
        visibility: hidden;
      }

      &.point {
        fill: white;
        stroke-width: 2;
      }

      &.vertical-line {
        stroke: #666;
        stroke-width: 1;
        stroke-dasharray: 3, 3;
        pointer-events: none;
      }
    }

    .legend-item {
      pointer-events: none;

      text {
        font-size: 0.8em;
      }

      rect {
        width: 1em;
        height: 1em;
        display: inline-block;
        margin-right: 0.5rem;
      }
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
  @state()
  private declare _startDate: string;
  @state()
  private declare _endDate: string;
  @state()
  private declare _minDate: string;
  @state()
  private declare _maxDate: string;

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
    this._startDate = "";
    this._endDate = "";
    this._minDate = "";
    this._maxDate = "";
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

    if (this._data.length) {
      const dates = this._data.map((d) =>
        this._config.xSerie.accessor(d)
      ) as Date[];
      const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
      this._minDate = minDate.toISOString().split("T")[0];
      this._maxDate = maxDate.toISOString().split("T")[0];
      this._startDate = this._minDate;
      this._endDate = this._maxDate;
    }

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

  public get filteredData(): ChartDataRow[] {
    if (!this._data.length || !this._startDate || !this._endDate) return [];
    const startDate = new Date(this._startDate);
    const endDate = new Date(this._endDate);
    // Adjust for timezone offset by setting hours to noon
    startDate.setHours(12, 0, 0, 0);
    endDate.setHours(12, 0, 0, 0);

    return this._data.filter((d) => {
      const date = this._config.xSerie.accessor(d) as Date;
      return date >= startDate && date <= endDate;
    });
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
      changedProperties.has("_selectedSeries") ||
      changedProperties.has("_hiddenSeries") ||
      changedProperties.has("_config") ||
      changedProperties.has("_startDate") ||
      changedProperties.has("_endDate")
    ) {
      this.#renderChart();
    }
  }

  #handleSeriesChange = (event: Event): void => {
    const target = event.target as HTMLSelectElement;
    this._selectedSeries = target.value;
  };

  #handleStartDateChange = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    this._startDate = target.value;
  };

  #handleEndDateChange = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    this._endDate = target.value;
  };

  #handleResetDates = (): void => {
    this._startDate = this._minDate;
    this._endDate = this._maxDate;
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
      .data(this.filteredData)
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
          <div class="controls-left">
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
          </div>
          <div class="controls-right">
            <input
              type="date"
              .value=${this._startDate}
              .min=${this._minDate}
              .max=${this._endDate}
              @change=${this.#handleStartDateChange}
              ?disabled=${!hasData}
            />
            <input
              type="date"
              .value=${this._endDate}
              .min=${this._startDate}
              .max=${this._maxDate}
              @change=${this.#handleEndDateChange}
              ?disabled=${!hasData}
            />
            <button @click=${this.#handleResetDates} ?disabled=${!hasData}>
              Reset Dates
            </button>
          </div>
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
