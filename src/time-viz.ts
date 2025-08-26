import { select, scaleOrdinal, schemeCategory10 } from "d3";
import type {
  TimeVizConfig,
  TimeVizSeriesConfig,
  ChartDataRow,
  MarginConfig,
} from "./types";
import { createTimeVizChart } from "./d3-time-viz";
import "tipviz";
import { TipVizTooltip } from "tipviz";

const style = /*css*/ `
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
  font-size: 0.9em;
}

input[type="date"] {
  padding: 0.4rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  font-size: 0.9em;
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
  border-radius: 0.25em;
  background: #007acc;
  color: white;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.2s;
}

button:hover {
    background: darken(#007acc, 5%);
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
}

.series .serie {
    fill: none;
    stroke-width: 2;
}

.series:has(.serie:hover, .point:hover) .series-group:not(:hover) {
    opacity: 0.3;
}

.series:has(.serie:hover, .point:hover) .series-group:hover {
    opacity: 1;
}

.series:has(.serie:hover, .point:hover) .series-group:hover .serie {
      stroke-width: 4;
}

.cursor.hidden {
    visibility: hidden;
}

.cursor.point {
    fill: white;
    stroke-width: 2;
}

.cursor.vertical-line {
    stroke: #666;
    stroke-width: 1;
    stroke-dasharray: 3, 3;
    pointer-events: none;
}

.legend-item {
  pointer-events: none;
}

.legend-item text {
    font-size: 0.8em;
}

.legend-item rect {
    width: 1em;
    height: 1em;
    display: inline-block;
    margin-right: 0.5rem;
}

.axis-label {
  font-size: 0.8em;
  text-anchor: middle;
}
`;

export class TimeViz extends HTMLElement {
  private declare isStatic: boolean;
  private declare transitionTime: number;
  private declare isCurved: boolean;
  private declare margin: MarginConfig;
  private declare xTicks: number;
  private declare yTicks: number;
  private declare formatXAxis: string;
  private declare formatYAxis: string;
  private declare yAxisLabel: string;
  private declare xAxisLabel: string;

  private declare _config: TimeVizConfig;
  private declare _data: ChartDataRow[];
  private declare _selectedSeries: string;
  private declare _hiddenSeries: Set<string>;
  private declare _startDate: string;
  private declare _endDate: string;
  private declare _minDate: string;
  private declare _maxDate: string;

  #svgRef!: SVGElement;
  #colorScale = scaleOrdinal(schemeCategory10);
  private declare _tooltip: TipVizTooltip;
  #shadowRoot: ShadowRoot;

  public static get observedAttributes() {
    return [
      "is-static",
      "transition-time",
      "is-curved",
      "margin",
      "x-ticks",
      "y-ticks",
      "format-x-axis",
      "format-y-axis",
      "y-axis-label",
      "x-axis-label",
    ];
  }

  constructor() {
    super();
    this.#shadowRoot = this.attachShadow({ mode: "open" });
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

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) {
      return;
    }
    switch (name) {
      case "is-static":
        this.isStatic = newValue !== null;
        break;
      case "transition-time":
        this.transitionTime = Number(newValue);
        break;
      case "is-curved":
        this.isCurved = newValue !== null;
        break;
      case "margin":
        try {
          this.margin = JSON.parse(newValue);
        } catch (e) {
          console.error("Failed to parse margin attribute:", e);
        }
        break;
      case "x-ticks":
        this.xTicks = Number(newValue);
        break;
      case "y-ticks":
        this.yTicks = Number(newValue);
        break;
      case "format-x-axis":
        this.formatXAxis = newValue;
        break;
      case "format-y-axis":
        this.formatYAxis = newValue;
        break;
      case "y-axis-label":
        this.yAxisLabel = newValue;
        break;
      case "x-axis-label":
        this.xAxisLabel = newValue;
        break;
    }
    this.#renderChart();
  }

  /**
   * Sets the configuration for the time series visualization.
   */
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

    this.render();
    this.#renderChart();
  }

  /**
   * Returns the labels for the Y-axis series.
   */
  public get ySeriesLabels(): string[] {
    if (!this._config?.ySeries?.length) return [];
    return this._config.ySeries.map(({ label }) => label);
  }

  /**
   * Returns the filtered series based on the selected and hidden series.
   */
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

  /**
   * Handles changes to the selected series.
   * @param event The change event.
   */
  #handleSeriesChange = (event: Event): void => {
    const target = event.target as HTMLSelectElement;
    this._selectedSeries = target.value;
    this.#renderChart();
  };

  /**
   * Handles changes to the start date.
   * @param event The change event.
   */
  #handleStartDateChange = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    this._startDate = target.value;
    this.render();
    this.#renderChart();
  };

  /**
   * Handles changes to the end date.
   * @param event The change event.
   */
  #handleEndDateChange = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    this._endDate = target.value;
    this.render();
    this.#renderChart();
  };

  /**
   * Handles changes to the reset dates.
   * @returns {void}
   */
  #handleResetDates = (): void => {
    this._startDate = this._minDate;
    this._endDate = this._maxDate;
    this.render();
    this.#renderChart();
  };

  /**
   * Renders the chart.
   * @returns {void}
   */
  #renderChart(): void {
    if (!this.#svgRef || !this._data.length || !this._config.ySeries.length)
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

    select(this.#svgRef).call(chart);
  }

  #fromString(html: string) {
    const range = document.createRange();
    const fragment = range.createContextualFragment(html);
    return fragment;
  }

  /**
   * Renders the time series visualization.
   * @returns {void} The rendered template.
   */
  public render() {
    this.#shadowRoot.innerHTML = "";
    const seriesLabels = this.ySeriesLabels;
    const hasData = this._data.length > 0 && this._config.ySeries.length > 0;

    const template = this.#fromString(/*html*/ `
      <style>${style}</style>
      <section>
        <div class="controls">
          <div class="controls-left">
            <select
              ${!hasData ? "disabled" : ""}
            >
              <option value="All">All Series</option>
              ${seriesLabels
                .map(
                  (label) =>
                    `<option value="${label}" ${
                      this._selectedSeries === label ? "selected" : ""
                    }>${label}</option>`
                )
                .join("")}
            </select>
          </div>
          <div class="controls-right">
            <input
              type="date"
              value=${this._startDate}
              min=${this._minDate}
              max=${this._endDate}
              ${!hasData ? "disabled" : ""}
            />
            <input
              type="date"
              value=${this._endDate}
              min=${this._startDate}
              max=${this._maxDate}
              ${!hasData ? "disabled" : ""}
            />
            <button ${!hasData ? "disabled" : ""}>
              Reset Dates
            </button>
          </div>
        </div>

        <figure>
          <slot name="chart-title" class="chart-title"></slot>
          <svg
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Time Series Chart"
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xlink="http://www.w3.org/1999/xlink"
          ></svg>
        </figure>
        <tip-viz-tooltip id="d3-tooltip" transition-time="250"></tip-viz-tooltip>
      </section>
    `);

    this.#shadowRoot.appendChild(template);
    this.#svgRef = this.#shadowRoot.querySelector("svg") as SVGElement;
    this._tooltip = this.#shadowRoot.querySelector(
      "#d3-tooltip"
    ) as TipVizTooltip;

    const selectElement = this.#shadowRoot.querySelector(
      "select"
    ) as HTMLSelectElement;
    selectElement.addEventListener("change", this.#handleSeriesChange);

    const [startDateInput, endDateInput] = this.#shadowRoot.querySelectorAll(
      "input[type='date']"
    ) as NodeListOf<HTMLInputElement>;
    startDateInput.addEventListener("change", this.#handleStartDateChange);
    endDateInput.addEventListener("change", this.#handleEndDateChange);

    const resetButton = this.#shadowRoot.querySelector(
      "button"
    ) as HTMLButtonElement;
    resetButton.addEventListener("click", this.#handleResetDates);
  }
}

customElements.define("time-viz", TimeViz);

declare global {
  interface HTMLElementTagNameMap {
    "time-viz": TimeViz;
  }
}
