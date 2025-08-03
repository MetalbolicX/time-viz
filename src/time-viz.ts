import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import {
  select,
  scaleOrdinal,
  schemeCategory10,
  extent,
  scaleLinear,
  axisLeft,
  axisBottom,
  format,
  curveMonotoneX,
  line,
  scaleTime,
  timeFormat,
} from "d3";
import type {
  TimeVizConfig,
  TimeVizSeriesConfig,
  ChartDataRow,
  MarginConfig,
} from "./types";
import { createTimeVizChart } from "./d3-time-viz";

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

    .grid line {
      stroke: #e0e0e0;
      stroke-width: 1;
    }

    .grid path {
      stroke-width: 0;
    }

    .serie {
      fill: none;
      stroke-width: 2;
    }

    .cursor-line {
      stroke: #666;
      stroke-width: 1;
      stroke-dasharray: 3, 3;
      opacity: 0;
      pointer-events: none;
    }

    .cursor-point {
      fill: white;
      stroke-width: 2;
      opacity: 0;
      pointer-events: none;
    }

    .legend {
      font-size: 12px;
    }

    .legend-item {
      cursor: pointer;
    }

    .legend-item.hidden {
      opacity: 0.3;
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

  @property({ type: String, attribute: "chart-title" })
  declare chartTitle: string;

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

  constructor() {
    super();
    this.isStatic = true;
    this.transitionTime = 0;
    this.isCurved = false;
    this.margin = { top: 40, right: 80, bottom: 60, left: 60 };
    this.xTicks = 5;
    this.yTicks = 5;
    this.formatXAxis = "%Y-%m-%d";
    this.formatYAxis = ".2f";
    this.chartTitle = "";
    this._data = [];
    this._selectedSeries = "All";
    this._hiddenSeries = new Set<string>();
    this._config = {
      data: [],
      xSerie: { accessor: (d: ChartDataRow) => d.date as Date },
      ySeries: [],
    };
  }

  public set config(cfg: TimeVizConfig) {
    this._config = cfg;
    this._data = [...cfg.data];
    this.margin = cfg.margin ?? this.margin;
    this.isStatic = cfg.isStatic ?? this.isStatic;
    this.isCurved = cfg.isCurved ?? this.isCurved;
    this.transitionTime = cfg.transitionTime ?? this.transitionTime;
    this.xTicks = cfg.xTicks ?? this.xTicks;
    this.yTicks = cfg.yTicks ?? this.yTicks;
    this.formatXAxis = cfg.formatXAxis ?? cfg.xSerie.format ?? this.formatXAxis;
    this.formatYAxis = cfg.formatYAxis ?? this.formatYAxis;
    this.chartTitle = cfg.chartTitle ?? this.chartTitle;
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
    // const chart = createTimeVizChart()
    //   .config(this._config)
    //   .series(this.filteredSeries)
    //   .data(this._data)
    //   .colorScale(this.#colorScale);

    // select(this.#svgRef.value).call(chart);
    if (
      !this.#svgRef.value ||
      !this._data?.length ||
      !this._config?.ySeries?.length
    )
      return;

    const svg = select(this.#svgRef.value);
    svg.selectAll("*").remove();

    const containerRect = this.#svgRef.value.getBoundingClientRect();
    const width = containerRect.width - this.margin.left - this.margin.right;
    const height = containerRect.height - this.margin.top - this.margin.bottom;
    if (width <= 0 || height <= 0) return;

    const g = svg
      .append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

    // X scale
    const xVals = this._data.map(this._config.xSerie.accessor);
    const xDomain = extent(xVals) as [Date | number, Date | number];
    const isTime = xDomain[0] instanceof Date;
    const xScale = isTime
      ? scaleTime()
          .domain(xDomain as [Date, Date])
          .range([0, width])
      : scaleLinear()
          .domain(xDomain as [number, number])
          .range([0, width]);

    // Y scale (all series)
    const yVals = this._data.flatMap((row) =>
      this.filteredSeries.map((s) => s.accessor(row))
    );
    const yDomain = extent(yVals) as [number, number];
    const yScale = scaleLinear().domain(yDomain).nice().range([height, 0]);

    // Grid
    const xGrid = axisBottom(xScale)
      .tickSize(-height)
      .tickFormat(() => "");
    const yGrid = axisLeft(yScale)
      .tickSize(-width)
      .tickFormat(() => "");
    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${height})`)
      .call(xGrid);
    g.append("g").attr("class", "grid").call(yGrid);

    // Axes
    const xAxis = axisBottom(xScale)
      .ticks(this.xTicks)
      .tickFormat(
        isTime
          ? (timeFormat(this.formatXAxis) as any)
          : (format(this.formatXAxis) as any)
      );
    const yAxis = axisLeft(yScale)
      .ticks(this.yTicks)
      .tickFormat(format(this.formatYAxis) as any);
    g.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis);
    g.append("g").attr("class", "axis").call(yAxis);

    // Draw lines for each series
    for (const serie of this.filteredSeries) {
      const linePath = line<ChartDataRow>()
        .x((d) => xScale(this._config.xSerie.accessor(d)))
        .y((d) => yScale(serie.accessor(d)));
      if (this.isCurved) linePath.curve(curveMonotoneX);
      g.append("path")
        .datum(this._data)
        .attr("class", "serie")
        .attr("d", linePath)
        .style(
          "stroke",
          serie.color || (this.#colorScale(serie.label) as string)
        );
    }

    // // Cursor interaction (only if not static)
    // if (!this.isStatic) {
    //   this._addCursorInteraction(g, xScale, yScale, width, height);
    // }

    // // Legend
    // this._renderLegend(g, width);
  }

  // private _addCursorInteraction(
  //   g: d3.Selection<SVGGElement, unknown, null, undefined>,
  //   xScale: d3.ScaleTime<number, number> | d3.ScaleLinear<number, number>,
  //   yScale: d3.ScaleLinear<number, number>,
  //   width: number,
  //   height: number
  // ): void {
  //   const cursorLine = g.append("line")
  //     .attr("class", "cursor-line")
  //     .attr("y1", 0)
  //     .attr("y2", height);

  //   const cursorPoints = g.selectAll(".cursor-point")
  //     .data(this.filteredSeries.map(s => s.label))
  //     .enter()
  //     .append("circle")
  //     .attr("class", "cursor-point")
  //     .attr("r", 4)
  //     .style("stroke", (d: string) => {
  //       const serie = this.filteredSeries.find(s => s.label === d);
  //       return serie?.color || this.colorScale(d) as string;
  //     });

  //   const overlay = g.append("rect")
  //     .attr("width", width)
  //     .attr("height", height)
  //     .style("fill", "none")
  //     .style("pointer-events", "all");

  //   overlay
  //     .on("mouseover", () => {
  //       cursorLine.style("opacity", 1);
  //       cursorPoints.style("opacity", 1);
  //     })
  //     .on("mouseout", () => {
  //       cursorLine.style("opacity", 0);
  //       cursorPoints.style("opacity", 0);
  //     })
  //     .on("mousemove", (event) => {
  //       const [mouseX] = d3.pointer(event);
  //       const xValue = xScale.invert(mouseX);
  //       cursorLine.attr("x1", mouseX).attr("x2", mouseX);
  //       // Find closest data point by x
  //       let closestIdx = 0;
  //       let minDist = Infinity;
  //       for (let i = 0; i < this._data.length; i++) {
  //         const v = this._config.x.accessor(this._data[i]);
  //         const dist = Math.abs((v instanceof Date ? v.getTime() : v) - (xValue instanceof Date ? xValue.getTime() : xValue));
  //         if (dist < minDist) {
  //           minDist = dist;
  //           closestIdx = i;
  //         }
  //       }
  //       const closest = this._data[closestIdx];
  //       this.filteredSeries.forEach(serie => {
  //         cursorPoints
  //           .filter((d: string) => d === serie.label)
  //           .attr("cx", xScale(this._config.x.accessor(closest)))
  //           .attr("cy", yScale(serie.accessor(closest)));
  //       });
  //     });
  // }

  // private _renderLegend(
  //   g: d3.Selection<SVGGElement, unknown, null, undefined>,
  //   width: number
  // ): void {
  //   const legend = g.append("g")
  //     .attr("class", "legend")
  //     .attr("transform", `translate(${width + 10}, 20)`);

  //   const legendItems = legend.selectAll(".legend-item")
  //     .data(this._config.series.map(s => s.label))
  //     .enter()
  //     .append("g")
  //     .attr("class", "legend-item")
  //     .attr("transform", (_d: string, i: number) => `translate(0, ${i * 20})`);

  //   legendItems.append("line")
  //     .attr("x1", 0)
  //     .attr("x2", 15)
  //     .attr("y1", 0)
  //     .attr("y2", 0)
  //     .style("stroke", (d: string) => {
  //       const serie = this._config.series.find(s => s.label === d);
  //       return serie?.color || this.colorScale(d) as string;
  //     })
  //     .style("stroke-width", 2);

  //   legendItems.append("text")
  //     .attr("x", 20)
  //     .attr("y", 0)
  //     .attr("dy", "0.35em")
  //     .text((d: string) => d);

  //   if (!this.isStatic) {
  //     legendItems
  //       .style("cursor", "pointer")
  //       .on("click", (event, label: string) => {
  //         if (this._hiddenSeries.has(label)) {
  //           this._hiddenSeries.delete(label);
  //         } else {
  //           this._hiddenSeries.add(label);
  //         }
  //         this._hiddenSeries = new Set(this._hiddenSeries);
  //       });
  //   }
  // }

  render() {
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
          ${this.chartTitle
            ? html`<h2 class="chart-title">${this.chartTitle}</h2>`
            : nothing}
          <svg
            ${ref(this.#svgRef)}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label=${this.chartTitle || "Time series chart"}
          ></svg>
        </figure>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "time-viz": TimeViz;
  }
}
