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

  #handleExport = (formatOrEvent?: Event | string): void => {
    // Accept either an event (from a button click) or a format string ('svg'|'png'|'jpg').
    const format = typeof formatOrEvent === "string" ? formatOrEvent : "png";
    if (!this.#svgRef.value) return;

    const svgElement = this.#svgRef.value;

    // Clone the SVG so we don't mutate the live DOM
    const clone = svgElement.cloneNode(true) as SVGElement;

    // Collect CSS rules from stylesheets that apply to elements inside the cloned SVG.
    // Skip stylesheets we can't access (CORS). Also handle simple @media rules.
    let cssText = "";
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList | null = null;
      try {
        rules = (sheet as CSSStyleSheet).cssRules;
      } catch (e) {
        // Could be a cross-origin stylesheet — skip it
        continue;
      }
      if (!rules) continue;

      for (const rule of Array.from(rules)) {
        // Style rules
        if (rule instanceof CSSStyleRule) {
          try {
            // Some selectors may throw on querySelectorAll (e.g. pseudo selectors), so guard
            if (clone.querySelector(rule.selectorText)) {
              cssText += rule.cssText + "\n";
            }
          } catch (e) {
            // ignore bad selectors
          }
        }
        // Handle simple @media containing style rules
        else if (rule instanceof CSSMediaRule) {
          const mediaRule = rule as CSSMediaRule;
          let mediaCss = "";
          for (const nested of Array.from(mediaRule.cssRules)) {
            if (nested instanceof CSSStyleRule) {
              try {
                if (clone.querySelector(nested.selectorText)) {
                  mediaCss += nested.cssText + "\n";
                }
              } catch (e) {
                // ignore
              }
            }
          }
          if (mediaCss) {
            cssText += `@media ${mediaRule.conditionText} { ${mediaCss} }\n`;
          }
        }
      }
    }

    // If we found any CSS rules, inject them into the cloned SVG inside a <style> element
    if (cssText) {
      const svgNS = "http://www.w3.org/2000/svg";
      const styleEl = document.createElementNS(svgNS, "style");
      styleEl.setAttribute("type", "text/css");
      // textContent is fine for style content inside SVG
      styleEl.textContent = cssText;
      // Insert as first child so rules apply during render
      clone.insertBefore(styleEl, clone.firstChild);
    }

    // Ensure necessary xmlns attributes exist on the root element
    if (!clone.getAttribute("xmlns")) {
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }
    if (!clone.getAttribute("xmlns:xlink")) {
      clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    }

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);

    // If the caller requested 'svg', just download the inlined SVG
    if (format === "svg") {
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `time-chart-${new Date().toISOString().split("T")[0]}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    // Otherwise render to canvas and export PNG or JPEG
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    // Use anonymous to avoid tainting canvas; works with Blob URL
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        // Determine drawing size from viewBox or bounding rect
        let width = 0;
        let height = 0;
        const viewBox = clone.getAttribute("viewBox");
        if (viewBox) {
          const parts = viewBox.split(/\s+/).map((p) => Number(p));
          if (parts.length === 4 && !Number.isNaN(parts[2]) && !Number.isNaN(parts[3])) {
            width = parts[2];
            height = parts[3];
          }
        }
        if (!width || !height) {
          const rect = svgElement.getBoundingClientRect();
          width = rect.width || 800;
          height = rect.height || 600;
        }

        const DPR = window.devicePixelRatio || 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(width * DPR);
        canvas.height = Math.round(height * DPR);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Failed to get canvas context");
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        // Fill background (SVG may have background via CSS). If SVG root has 'background' style, canvas will be transparent otherwise.
        // Try to detect background from computed style of original svg
        const comp = window.getComputedStyle(svgElement);
        const bg = comp && comp.getPropertyValue("background-color");
        if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Export blob depending on requested format
        const mime = format === "jpg" || format === "jpeg" ? "image/jpeg" : "image/png";
        canvas.toBlob(
          (blob) => {
            if (!blob) return;
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            const ext = mime === "image/png" ? "png" : "jpg";
            link.download = `time-chart-${new Date().toISOString().split("T")[0]}.${ext}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
          },
          mime,
          0.92
        );
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      // cleanup
      URL.revokeObjectURL(url);
      console.error("Failed to load SVG image for export");
    };
    img.src = url;
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
            @click=${() => this.#handleExport("png")}
            ?disabled=${!hasData}
            type="button"
          >
            Export PNG
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
