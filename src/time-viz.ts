import { select, scaleOrdinal, schemeCategory10 } from "d3";
import type {
  TimeVizConfig,
  TimeVizSeriesConfig,
  ChartDataRow,
  ChartConfig,
} from "@/types";
import { createTimeVizChart } from "@/d3-time-viz";
import { ChartEventEmitter } from "@/events";
import { DataService, ConfigurationManager } from "@/services";
import "tipviz";
import { TipVizTooltip } from "tipviz";

export class TimeViz extends HTMLElement {
  // Event emitter for chart communication
  #eventEmitter = new ChartEventEmitter();
  // Configuration manager
  #chartConfig: ChartConfig;

  // Chart state
  private declare _config: TimeVizConfig;
  private declare _data: ChartDataRow[];
  private declare _selectedSeries: string;
  private declare _hiddenSeries: Set<string>;
  private declare _startDate: string;
  private declare _endDate: string;
  private declare _minDate: string;
  private declare _maxDate: string;

  // DOM elements
  #svgRef!: SVGElement;
  #colorScale = scaleOrdinal(schemeCategory10);
  private declare _tooltip: TipVizTooltip;
  #shadowRoot: ShadowRoot;
  #selectElement!: HTMLSelectElement;
  #startDateInput!: HTMLInputElement;
  #endDateInput!: HTMLInputElement;
  #resetButton!: HTMLButtonElement;

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

  public static get styles(): string {
    return /*css*/ `
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
  `.trim();
  }

  constructor() {
    super();
    this.#shadowRoot = this.attachShadow({ mode: "open" });

    // Initialize default configuration
    this.#chartConfig = ConfigurationManager.getDefaultConfig();

    // Initialize chart state
    this._data = [];
    this._selectedSeries = "All";
    this._hiddenSeries = new Set<string>();
    this._config = {
      data: [],
      xSerie: { accessor: (d: ChartDataRow) => d.date as Date },
      ySeries: [],
    };
    this._startDate = "";
    this._endDate = "";
    this._minDate = "";
    this._maxDate = "";

    this.#createDOM();
  }

  /**
   * Called when the element is connected to the DOM.
   */
  public connectedCallback() {
    // Parse initial attributes
    const attributeConfig = ConfigurationManager.createFromAttributes(this);
    this.#chartConfig = ConfigurationManager.mergeConfigs(
      this.#chartConfig,
      attributeConfig
    );
    this.#addEventListeners();
    this.render();
  }

  /**
   * Called when the element is disconnected from the DOM.
   */
  public disconnectedCallback() {
    this.#removeEventListeners();
  }

  /**
   * Called when an observed attribute is changed.
   * @param name - The name of the attribute that changed.
   * @param oldValue - The old value of the attribute.
   * @param newValue - The new value of the attribute.
   * @returns {void}
   */
  public attributeChangedCallback(
    _name: string,
    oldValue: string,
    newValue: string
  ): void {
    if (oldValue === newValue) {
      return;
    }

    const attributeConfig = ConfigurationManager.createFromAttributes(this);
    this.#chartConfig = ConfigurationManager.mergeConfigs(
      ConfigurationManager.getDefaultConfig(),
      attributeConfig
    );
    this.#eventEmitter.emit("config-changed", { config: this.#chartConfig });
    this.render();
  }

  /**
   * Sets the configuration for the time series visualization.
   */
  public set config(cfg: TimeVizConfig) {
    this._config = cfg;
    this._data = [...cfg.data];
    this._selectedSeries = "All";
    this._hiddenSeries = new Set<string>();

    // Calculate date range using DataService
    if (DataService.validateDataSet(this._data)) {
      const dateDomain = DataService.getDataDomain(this._data, [
        this._config.xSerie.accessor as any,
      ]);
      if (dateDomain) {
        const [minTime, maxTime] = dateDomain;
        const minDate = new Date(minTime);
        const maxDate = new Date(maxTime);
        this._minDate = minDate.toISOString().split("T")[0];
        this._maxDate = maxDate.toISOString().split("T")[0];
        this._startDate = this._minDate;
        this._endDate = this._maxDate;
      }
    }

    // Emit data change event
    this.#eventEmitter.emit("data-changed", {
      data: this._data,
      timestamp: Date.now(),
    });
    this.render();
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
    return DataService.selectedSeries(
      this._config.ySeries,
      this._selectedSeries,
      this._hiddenSeries
    );
  }

  /**
   * Returns the filtered data based on the date range.
   * Series filtering is handled at the series configuration level.
   */
  public get filteredData(): ChartDataRow[] {
    if (!DataService.validateDataSet(this._data)) return [];
    if (!this._startDate || !this._endDate) return this._data;

    const startDate = new Date(this._startDate);
    const endDate = new Date(this._endDate);
    // Adjust for timezone offset by setting hours to noon
    startDate.setHours(12, 0, 0, 0);
    endDate.setHours(12, 0, 0, 0);

    return this._data.filter((d) => {
      const date = this._config.xSerie.accessor(d) as Date;
      if (!(date instanceof Date)) return false;
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

    // Emit series change event
    this.#eventEmitter.emit("series-changed", {
      selectedSeries: this._selectedSeries,
      hiddenSeries: this._hiddenSeries,
    });

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
  };

  /**
   * Handles changes to the end date.
   * @param event The change event.
   */
  #handleEndDateChange = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    this._endDate = target.value;
    this.render();
  };

  /**
   * Handles changes to the reset dates.
   * @returns {void}
   */
  #handleResetDates = (): void => {
    this._startDate = this._minDate;
    this._endDate = this._maxDate;
    this.render();
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
      .formatXAxis(this.#chartConfig.formatXAxis)
      .formatYAxis(this.#chartConfig.formatYAxis)
      .isCurved(this.#chartConfig.isCurved)
      .isStatic(this.#chartConfig.isStatic)
      .margin(this.#chartConfig.margin)
      .series(this.filteredSeries)
      .tooltip(this._tooltip)
      .transitionTime(this.#chartConfig.transitionTime)
      .xAxisLabel(this.#chartConfig.xAxisLabel)
      .xSerie(this._config.xSerie.accessor)
      .xTicks(this.#chartConfig.xTicks)
      .yAxisLabel(this.#chartConfig.yAxisLabel)
      .yTicks(this.#chartConfig.yTicks);

    select(this.#svgRef).call(chart);

    // Emit render complete event
    this.#eventEmitter.emit("render-complete", { renderTime: Date.now() });
  }

  /**
   * Creates a DocumentFragment from an HTML string.
   * @param html - The HTML string to convert.
   * @returns A DocumentFragment containing the parsed HTML.
   */
  #fromString(html: string): DocumentFragment {
    return document.createRange().createContextualFragment(html);
  }

  /**
   * Creates the DOM elements for the component.
   */
  #createDOM() {
    const styleSheet = new CSSStyleSheet();
    styleSheet.replaceSync(TimeViz.styles);
    this.#shadowRoot.adoptedStyleSheets = [styleSheet];

    const template = this.#fromString(/*html*/ `
      <section>
        <div class="controls">
          <div class="controls-left">
            <select>
              <option value="All">All Series</option>
            </select>
          </div>
          <div class="controls-right">
            <input type="date" />
            <input type="date" />
            <button>Reset Dates</button>
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
    this.#selectElement = this.#shadowRoot.querySelector(
      "select"
    ) as HTMLSelectElement;
    const [startDateInput, endDateInput] = this.#shadowRoot.querySelectorAll(
      "input[type='date']"
    ) as NodeListOf<HTMLInputElement>;
    this.#startDateInput = startDateInput;
    this.#endDateInput = endDateInput;
    this.#resetButton = this.#shadowRoot.querySelector(
      "button"
    ) as HTMLButtonElement;
  }

  /**
   * Sets up event listeners for internal chart events.
   * @returns {void}
   */
  #setupEventListeners(): void {
    // Listen to internal chart events
    this.#eventEmitter.on("data-changed", (event) => {
      console.log("[TimeViz] Data changed:", event.detail);
    });

    this.#eventEmitter.on("config-changed", (event) => {
      console.log("[TimeViz] Config changed:", event.detail);
    });

    this.#eventEmitter.on("series-changed", (event) => {
      console.log("[TimeViz] Series changed:", event.detail);
      this.#renderChart();
    });

    this.#eventEmitter.on("render-complete", (event) => {
      console.log("[TimeViz] Render complete:", event.detail);
    });
  }

  /**
   * Adds event listeners for the DOM elements.
   * @returns {void}
   */
  #addEventListeners(): void {
    this.#selectElement.addEventListener("change", this.#handleSeriesChange);
    this.#startDateInput.addEventListener(
      "change",
      this.#handleStartDateChange
    );
    this.#endDateInput.addEventListener("change", this.#handleEndDateChange);
    this.#resetButton.addEventListener("click", this.#handleResetDates);

    // Setup internal event listeners
    this.#setupEventListeners();
  }

  /**
   * Removes event listeners for the component.
   * @returns {void}
   */
  #removeEventListeners(): void {
    this.#selectElement.removeEventListener("change", this.#handleSeriesChange);
    this.#startDateInput.removeEventListener(
      "change",
      this.#handleStartDateChange
    );
    this.#endDateInput.removeEventListener("change", this.#handleEndDateChange);
    this.#resetButton.removeEventListener("click", this.#handleResetDates);
    select(this.#svgRef)
      .on("pointermove", null)
      .on("pointerover", null)
      .on("pointerout", null);
  }

  /**
   * Renders the time series visualization.
   * @returns {void} The rendered template.
   */
  public render() {
    const seriesLabels = this.ySeriesLabels;
    const hasData = this._data.length > 0 && this._config.ySeries.length > 0;

    // Update select options
    while (this.#selectElement.firstChild) {
      this.#selectElement.removeChild(this.#selectElement.firstChild);
    }
    const allOption = document.createElement("option");
    allOption.value = "All";
    allOption.textContent = "All Series";
    if (this._selectedSeries === "All") {
      allOption.selected = true;
    }
    const optionElements = seriesLabels.map((label) => {
      const option = document.createElement("option");
      option.value = label;
      option.textContent = label;
      if (this._selectedSeries === label) {
        option.selected = true;
      }
      return option;
    });
    this.#selectElement.append(allOption, ...optionElements);

    // Update controls state
    this.#selectElement.disabled = !hasData;
    this.#startDateInput.disabled = !hasData;
    this.#endDateInput.disabled = !hasData;
    this.#resetButton.disabled = !hasData;

    // Update date input values and constraints
    if (this._startDate) {
      this.#startDateInput.value = this._startDate;
      this.#startDateInput.min = this._minDate;
      this.#startDateInput.max = this._endDate || this._maxDate;
    }

    if (this._endDate) {
      this.#endDateInput.value = this._endDate;
      this.#endDateInput.min = this._startDate || this._minDate;
      this.#endDateInput.max = this._maxDate;
    }

    this.#renderChart();
  }
}

customElements.define("time-viz", TimeViz);

declare global {
  interface HTMLElementTagNameMap {
    "time-viz": TimeViz;
  }
}
