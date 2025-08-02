import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import * as d3 from "d3";

interface TimeSeriesDataPoint {
  date: Date;
  value: number;
  series?: string;
}

interface MarginConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

@customElement("time-viz")
export class TimeViz extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
      font-size: 12px;
    }

    .grid line {
      stroke: #e0e0e0;
      stroke-width: 1;
    }

    .grid path {
      stroke-width: 0;
    }

    .line {
      fill: none;
      stroke-width: 2;
    }

    .cursor-line {
      stroke: #666;
      stroke-width: 1;
      stroke-dasharray: 3,3;
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
  private declare _data: TimeSeriesDataPoint[];

  @state()
  private declare _selectedSeries: string;

  @state()
  private declare _hiddenSeries: Set<string>;

  private svgRef = createRef<SVGElement>();
  private colorScale = d3.scaleOrdinal(d3.schemeCategory10);

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
  }

  set data(value: TimeSeriesDataPoint[]) {
    const oldValue = this._data;
    this._data = value;
    this.requestUpdate("data", oldValue);
  }

  get data(): TimeSeriesDataPoint[] {
    return this._data;
  }

  get availableSeries(): string[] {
    const series = new Set(this._data.map(d => d.series || "default"));
    return Array.from(series).sort();
  }

  get filteredData(): TimeSeriesDataPoint[] {
    if (!this._data.length) return [];

    let filtered = this._data;

    if (this._selectedSeries !== "All") {
      filtered = filtered.filter(d => (d.series || "default") === this._selectedSeries);
    }

    return filtered.filter(d => !this._hiddenSeries.has(d.series || "default"));
  }

  protected updated(changedProperties: Map<string | number | symbol, unknown>): void {
    if (changedProperties.has("_data") ||
        changedProperties.has("_selectedSeries") ||
        changedProperties.has("_hiddenSeries")) {
      this._renderChart();
    }
  }

  private _handleSeriesChange = (event: Event): void => {
    const target = event.target as HTMLSelectElement;
    this._selectedSeries = target.value;
  };

  private _handleExport = (): void => {
    if (!this.svgRef.value) return;

    const svgElement = this.svgRef.value;
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

  private _renderChart(): void {
    if (!this.svgRef.value || !this.filteredData.length) return;

    const svg = d3.select(this.svgRef.value);
    svg.selectAll("*").remove();

    const containerRect = this.svgRef.value.getBoundingClientRect();
    const width = containerRect.width - this.margin.left - this.margin.right;
    const height = containerRect.height - this.margin.top - this.margin.bottom;

    if (width <= 0 || height <= 0) return;

    const g = svg.append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(this.filteredData, (d: TimeSeriesDataPoint) => d.date) as [Date, Date])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(this.filteredData, (d: TimeSeriesDataPoint) => d.value) as [number, number])
      .nice()
      .range([height, 0]);

    // Grid
    const xGrid = d3.axisBottom(xScale)
      .tickSize(-height)
      .tickFormat(() => "");

    const yGrid = d3.axisLeft(yScale)
      .tickSize(-width)
      .tickFormat(() => "");

    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${height})`)
      .call(xGrid);

    g.append("g")
      .attr("class", "grid")
      .call(yGrid);

    // Axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(this.xTicks)
      .tickFormat(d3.timeFormat(this.formatXAxis) as any);

    const yAxis = d3.axisLeft(yScale)
      .ticks(this.yTicks)
      .tickFormat(d3.format(this.formatYAxis) as any);

    g.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis);

    g.append("g")
      .attr("class", "axis")
      .call(yAxis);

    // Line generator
    const line = d3.line<TimeSeriesDataPoint>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value));

    if (this.isCurved) {
      line.curve(d3.curveMonotoneX);
    }

    // Group data by series
    const seriesData = d3.group(this.filteredData, (d: TimeSeriesDataPoint) => d.series || "default");

    // Draw lines
    seriesData.forEach((data: TimeSeriesDataPoint[], seriesName: string) => {
      const sortedData = data.sort((a, b) => a.date.getTime() - b.date.getTime());

      g.append("path")
        .datum(sortedData)
        .attr("class", "line")
        .attr("d", line)
        .style("stroke", this.colorScale(seriesName) as string);
    });

    // Cursor interaction (only if not static)
    if (!this.isStatic) {
      this._addCursorInteraction(g, xScale, yScale, width, height, seriesData);
    }

    // Legend
    this._renderLegend(g, width, seriesData);
  }

  private _addCursorInteraction(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    xScale: d3.ScaleTime<number, number>,
    yScale: d3.ScaleLinear<number, number>,
    width: number,
    height: number,
    seriesData: d3.InternMap<string, TimeSeriesDataPoint[]>
  ): void {
    const cursorLine = g.append("line")
      .attr("class", "cursor-line")
      .attr("y1", 0)
      .attr("y2", height);

    const cursorPoints = g.selectAll(".cursor-point")
      .data(Array.from(seriesData.keys()))
      .enter()
      .append("circle")
      .attr("class", "cursor-point")
      .attr("r", 4)
      .style("stroke", (d: string) => this.colorScale(d) as string);

    const overlay = g.append("rect")
      .attr("width", width)
      .attr("height", height)
      .style("fill", "none")
      .style("pointer-events", "all");

    overlay
      .on("mouseover", () => {
        cursorLine.style("opacity", 1);
        cursorPoints.style("opacity", 1);
      })
      .on("mouseout", () => {
        cursorLine.style("opacity", 0);
        cursorPoints.style("opacity", 0);
      })
      .on("mousemove", (event) => {
        const [mouseX] = d3.pointer(event);
        const date = xScale.invert(mouseX);

        cursorLine.attr("x1", mouseX).attr("x2", mouseX);

        seriesData.forEach((data: TimeSeriesDataPoint[], seriesName: string) => {
          const bisector = d3.bisector((d: TimeSeriesDataPoint) => d.date).left;
          const index = bisector(data, date);
          const closestPoint = data[index] || data[index - 1];

          if (closestPoint) {
            cursorPoints
              .filter((d: string) => d === seriesName)
              .attr("cx", xScale(closestPoint.date))
              .attr("cy", yScale(closestPoint.value));
          }
        });
      });
  }

  private _renderLegend(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    width: number,
    seriesData: d3.InternMap<string, TimeSeriesDataPoint[]>
  ): void {
    const legend = g.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width + 10}, 20)`);

    const legendItems = legend.selectAll(".legend-item")
      .data(Array.from(seriesData.keys()))
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (_d: string, i: number) => `translate(0, ${i * 20})`);

    legendItems.append("line")
      .attr("x1", 0)
      .attr("x2", 15)
      .attr("y1", 0)
      .attr("y2", 0)
      .style("stroke", (d: string) => this.colorScale(d) as string)
      .style("stroke-width", 2);

    legendItems.append("text")
      .attr("x", 20)
      .attr("y", 0)
      .attr("dy", "0.35em")
      .text((d: string) => d);

    if (!this.isStatic) {
      legendItems
        .style("cursor", "pointer")
        .on("click", (event, seriesName: string) => {
          if (this._hiddenSeries.has(seriesName)) {
            this._hiddenSeries.delete(seriesName);
          } else {
            this._hiddenSeries.add(seriesName);
          }
          this._hiddenSeries = new Set(this._hiddenSeries);
        });
    }
  }

  render() {
    const series = this.availableSeries;
    const hasData = this._data.length > 0;

    return html`
      <section>
        <div class="controls">
          <select
            @change=${this._handleSeriesChange}
            .value=${this._selectedSeries}
            ?disabled=${!hasData}
          >
            <option value="All">All Series</option>
            ${series.map(s => html`<option value=${s}>${s}</option>`)}
          </select>

          <button
            @click=${this._handleExport}
            ?disabled=${!hasData}
            type="button"
          >
            Export SVG
          </button>
        </div>

        <figure>
          ${this.chartTitle ? html`<h2 class="chart-title">${this.chartTitle}</h2>` : nothing}
          <svg
            ${ref(this.svgRef)}
            viewBox="0 0 800 400"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label=${this.chartTitle || "Time series chart"}
          >
          </svg>
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
