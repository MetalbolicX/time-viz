import * as d3 from "d3";
import type { Selection, ScaleOrdinal } from "d3";
import type {
  TimeVizConfig,
  TimeVizSeriesConfig,
  ChartDataRow,
  MarginConfig,
} from "./types";
import type { TipVizTooltip } from "tipviz";

/**
 * @module d3-time-viz
 * @description
 * This module provides a function to create a time visualization chart using D3.js.
 * It allows for multiple series, custom colors, and various configurations.
 */

/**
 * Creates a time visualization chart using D3.js.
 * The chart supports multiple series, custom colors, and various configurations.
 *
 * @returns {Function} A function that can be called with a D3 selection to render the chart.
 */
export const createTimeVizChart = () => {
  // Centralized default values
  const defaultConfig = {
    transitionTime: 0,
    xTicks: 5,
    yTicks: 5,
    margin: {
      top: 30,
      right: 40,
      bottom: 30,
      left: 40,
    } as MarginConfig,
    formatXAxis: "%Y-%m-%d",
    formatYAxis: ".2f",
    yAxisLabel: "",
    xAxisLabel: "",
    isCurved: false,
    isStatic: false,
  };

  let tooltip: TipVizTooltip;
  let config: TimeVizConfig;
  let series: TimeVizSeriesConfig[];
  let data: ChartDataRow[];
  let colorScale: d3.ScaleOrdinal<string, string>;
  let isCurved: boolean = defaultConfig.isCurved;
  let isStatic: boolean = defaultConfig.isStatic;
  let transitionTime: number = defaultConfig.transitionTime;
  let xTicks: number = defaultConfig.xTicks;
  let yTicks: number = defaultConfig.yTicks;
  let margin: MarginConfig = { ...defaultConfig.margin };
  let formatXAxis: string = defaultConfig.formatXAxis;
  let formatYAxis: string = defaultConfig.formatYAxis;
  let xSerie: (d: ChartDataRow) => Date | number;
  let innerWidth: number = 0;
  let innerHeight: number = 0;
  let xScale: d3.ScaleTime<number, number>;
  let yScale: d3.ScaleLinear<number, number>;
  let yAxisLabel: string = defaultConfig.yAxisLabel;
  let xAxisLabel: string = defaultConfig.xAxisLabel;

  /**
   * Utility function to get the size of the SVG element.
   * @description
   * It retrieves the width and height of the SVG element from its bounding client rectangle.
   * @param {Selection<SVGElement, unknown, null, undefined>} selection - The D3 selection of the SVG element.
   * @returns {Object} An object containing the width and height of the SVG element.
   */
  const getSize = (
    selection: Selection<SVGElement, unknown, null, undefined>
  ) => {
    const { width = 0, height = 0 } =
      selection.node()?.getBoundingClientRect() || {};
    return { width, height };
  };

  /**
   * Renders the X axis of the chart.
   * @description
   * The X axis is scaled based on the xSerie accessor and formatted according to `formatXAxis`.
   * It uses the X scale to determine the positions of the ticks.
   * @param {Selection<SVGElement, unknown, null, undefined>} selection - The D3 selection of the SVG element.
   * @returns {void}
   */
  const renderXAxis = (
    selection: Selection<SVGElement, unknown, null, undefined>
  ): void => {
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(xTicks)
      .tickFormat(d3.timeFormat(formatXAxis) as any);

    selection
      .selectAll("g.x.axis")
      .data([null])
      .join("g")
      .attr("class", "x axis")
      .attr("transform", `translate(0, ${innerHeight + margin.top})`)
      .call(xAxis as any);
  };

  /**
   * Renders the Y axis of the chart.
   * @description
   * The Y axis is scaled based on the data and series provided.
   * It uses a linear scale and formats the ticks according to `formatYAxis`.
   * @param {Selection<SVGElement, unknown, null, undefined>} selection - The D3 selection of the SVG element.
   * @returns {void}
   */
  const renderYAxis = (
    selection: Selection<SVGElement, unknown, null, undefined>
  ): void => {
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(yTicks)
      .tickFormat(d3.format(formatYAxis));

    selection
      .selectAll("g.y.axis")
      .data([null])
      .join("g")
      .attr("class", "y axis")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(yAxis as any);
  };

  /**
   * Renders the X grid lines on the chart.
   * @description
   * The grid lines are drawn at each tick of the X scale.
   * It uses the X scale to determine the positions of the grid lines.
   * @param {Selection<SVGElement, unknown, null, undefined>} selection - The D3 selection of the SVG element.
   * @returns {void}
   */
  const renderXGrid = (
    selection: Selection<SVGElement, unknown, null, undefined>
  ): void => {
    const [yMin, yMax] = yScale.domain();
    selection
      .selectAll(".grids")
      .data([null])
      .join("g")
      .attr("class", "grids")
      .selectAll(".x.grid")
      .data(xScale.ticks(xTicks))
      .join("line")
      .attr("class", "x grid")
      .attr("x1", (d) => xScale(d))
      .attr("y1", yScale(yMin))
      .attr("x2", (d) => xScale(d))
      .attr("y2", yScale(yMax));
  };

  /**
   * Renders the Y grid lines on the chart.
   * @description
   * The grid lines are drawn at each tick of the Y scale.
   * It uses the Y scale to determine the positions of the grid lines.
   * @param {Selection<SVGElement, unknown, null, undefined>} selection - The D3 selection of the SVG element.
   * @returns {void}
   */
  const renderYGrid = (
    selection: Selection<SVGElement, unknown, null, undefined>
  ): void => {
    const [xMin, xMax] = xScale.domain();
    selection
      .selectAll(".grids")
      .data([null])
      .join("g")
      .attr("class", "grids")
      .selectAll(".y.grid")
      .data(yScale.ticks(yTicks))
      .join("line")
      .attr("class", "y grid")
      .attr("x1", xScale(xMin))
      .attr("y1", (d) => yScale(d))
      .attr("x2", xScale(xMax))
      .attr("y2", (d) => yScale(d));
  };

  /**
   * Renders the series lines on the chart.
   * @description
   * Each series is represented by a path element.
   * The lines can be curved based on the `isCurved` flag.
   * @param {Selection<SVGElement, unknown, null, undefined>} selection - The D3 selection of the SVG element.
   * @returns {void}
   */
  const renderSeries = (
    selection: Selection<SVGElement, unknown, null, undefined>
  ): void => {
    if (!config || !series?.length || !data?.length) return;

    const lineGenerators = series.map(({ accessor }) => {
      const line = d3
        .line<ChartDataRow>()
        .x((d) => xScale(xSerie(d)))
        .y((d) => yScale(accessor(d)));
      isCurved && line.curve(d3.curveCatmullRom);
      return line;
    });

    selection
      .selectAll(".series")
      .data([null])
      .join("g")
      .attr("class", "series")
      .selectAll<SVGPathElement, TimeVizSeriesConfig>("path.serie")
      .data(series, ({ label }) => label)
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("class", "serie")
            .attr("data-label", ({ label }) => label)
            .attr("d", (_, i) => lineGenerators.at(i)?.(data) ?? "")
            .style("stroke", ({ color, label }) => color || colorScale(label))
            .call((serie) => {
              const node = serie.node();
              if (!node) return;
              const totalLength = node.getTotalLength();
              serie
                .attr("stroke-dasharray", totalLength)
                .attr("stroke-dashoffset", totalLength)
                .transition()
                .duration(transitionTime)
                .attr("stroke-dashoffset", 0);
            }),
        (update) =>
          update
            .transition()
            .duration(transitionTime)
            .style("stroke", ({ color, label }) => color || colorScale(label))
            .attr("d", (_, i) => lineGenerators.at(i)?.(data) ?? ""),
        (exit) => exit.remove()
      );
  };

  /**
   * Renders the cursor on the chart.
   * @description
   * The cursor is a vertical line and points that follow the mouse position.
   * It highlights the closest data point to the mouse position.
   * @param {Selection<SVGElement, unknown, null, undefined>} selection - The D3 selection of the SVG element.
   * @param {ChartDataRow} closestRow - The closest data row to the mouse position.
   * @returns {void}
   */
  const renderCursor = (
    selection: Selection<SVGElement, unknown, null, undefined>,
    closestRow: ChartDataRow
  ): void => {
    if (isStatic) return;
    const cursorGroup = selection
      .selectAll("g.cursor")
      .data([null])
      .join("g")
      .attr("class", "cursor");

    cursorGroup
      .selectAll(".cursor-point")
      .data(
        series.map(({ accessor, label, color }) => ({
          label,
          color,
          x: xSerie(closestRow),
          y: accessor(closestRow),
        }))
      )
      .join("circle")
      .attr("class", "cursor-point")
      .attr("cx", ({ x }) => xScale(x))
      .attr("cy", ({ y }) => yScale(y))
      .attr("r", 4)
      .style("stroke", ({ color, label }) => color || colorScale(label));

    cursorGroup
      .selectAll(".cursor-line")
      .data([closestRow])
      .join("line")
      .attr("class", "cursor-line")
      .attr("x1", xScale(xSerie(closestRow)))
      .attr("y1", margin.top)
      .attr("x2", xScale(xSerie(closestRow)))
      .attr("y2", innerHeight + margin.top);
  };

  /**
   * Renders the Y axis label on the chart.
   * @description
   * The Y axis label is positioned at the left side of the chart.
   * It is rotated to be vertical and positioned according to the margin.
   * @param {Selection<SVGElement, unknown, null, undefined>} selection - The D3 selection of the SVG element.
   * @returns {void}
   */
  const renderYAxisLabel = (
    selection: Selection<SVGElement, unknown, null, undefined>
  ): void => {
    if (!yAxisLabel) return;
    selection
      .selectAll(".labels")
      .data([null])
      .join("g")
      .attr("class", "labels")
      .selectAll(".y.axis-label")
      .data([yAxisLabel])
      .join("text")
      .attr("class", "y axis-label")
      .attr("x", -margin.left)
      .attr("y", margin.top)
      .attr("transform", `rotate(-90, ${margin.left}, ${margin.top})`)
      .attr("dy", "1em")
      .text((d) => d);
  };

  /**
   * Renders the X axis label on the chart.
   * @description
   * The X axis label is positioned at the bottom of the chart.
   * It is centered horizontally and positioned according to the margin.
   * @param {Selection<SVGElement, unknown, null, undefined>} selection - The D3 selection of the SVG element.
   * @returns {void}
   */
  const renderXAxisLabel = (
    selection: Selection<SVGElement, unknown, null, undefined>
  ): void => {
    if (!xAxisLabel) return;
    selection
      .selectAll(".labels")
      .data([null])
      .join("g")
      .attr("class", "labels")
      .selectAll(".x.axis-label")
      .data([xAxisLabel])
      .join("text")
      .attr("class", "x axis-label")
      .attr("x", innerWidth / 2 + margin.left)
      .attr("y", innerHeight + margin.top)
      .attr("dy", "-0.5em")
      .text((d) => d);
  };

  const renderLegend = (
    selection: Selection<SVGElement, unknown, null, undefined>
  ): void => {
    if (!config || !series?.length) return;

    const legendGroup = selection
      .selectAll("g.legend")
      .data([null])
      .join("g")
      .attr("class", "legend")
      .attr("transform", `translate(${innerWidth}, ${margin.top})`);

    legendGroup
      .selectAll(".legend-item")
      .data(series)
      .join("g")
      .attr("class", "legend-item")
      .attr("data-label", ({ label }) => label)
      .attr("transform", (_, i) => `translate(0, ${20 * i})`)
      .call((group) => {
        group
          .selectAll("rect")
          .data((d) => [d])
          .join("rect")
          .attr("class", "legend-square")
          .style("fill", ({ color, label }) => color || colorScale(label));

        group
          .selectAll("text")
          .data((d) => [d])
          .join("text")
          .attr("class", "legend-label")
          .attr("x", 20)
          .attr("y", 14)
          .text(({ label }) => label);
      });
  };

  /**
   * Handle the cursor line and the closest point when the user moves the cursor.
   * @param event - The pointer event
   * @param selection - The D3 selection of the SVG element
   * @returns {void}
   */
  let lastCursorIdx: number | null = null;
  const handlePointerMoveCursor = (
    event: PointerEvent,
    selection: Selection<SVGElement, unknown, null, undefined>
  ) => {
    const [mouseX, mouseY] = d3.pointer(event);
    const [xMinRange, xMaxRange] = xScale.range();
    const [yMaxRange, yMinRange] = yScale.range();
    // Check if mouse is within the chart area
    const isWithinXAxis = mouseX >= xMinRange && mouseX <= xMaxRange;
    const isWithinYAxis = mouseY >= yMinRange && mouseY <= yMaxRange;
    if (!(isWithinXAxis && isWithinYAxis)) {
      selection.select(".cursor").classed("hidden", true);
      lastCursorIdx = null;
      return;
    }
    if (!data.length) return;
    // Use d3.bisector for O(log n) lookup
    const xValues = data.map(xSerie);
    const mouseDate = xScale.invert(mouseX);
    const bisect = d3.bisector((d: Date | number) => d).center;
    const idx = bisect(xValues, mouseDate);
    // Clamp index to valid range
    const clampedIdx = Math.max(0, Math.min(idx, data.length - 1));
    if (lastCursorIdx === clampedIdx) return; // Only update if changed
    lastCursorIdx = clampedIdx;
    const closestDatum = data.at(clampedIdx);
    if (closestDatum) selection.call(renderCursor, closestDatum);
  };

  /**
   * Handle the closest point when the user hovers over a point.
   * @param event.target - The pointer event target
   * @returns {void}
   */
  let lastTooltipDatum: any = null;
  let hideTooltipTimeout: any = null;
  const TOOLTIP_HIDE_DELAY = 40; // ms

  const handleClosestPointOver = ({ target }: PointerEvent) => {
    if (target instanceof SVGElement && target.classList.contains("cursor-point")) {
      const datum = d3.select(target).datum();
      if (hideTooltipTimeout) {
        clearTimeout(hideTooltipTimeout);
        hideTooltipTimeout = null;
      }
      // Only show if not already showing for this datum
      if (lastTooltipDatum !== datum) {
        tooltip.show(datum as ChartDataRow, target);
        lastTooltipDatum = datum;
      }
    }
  };

  /**
   * Handle the closest point when the user moves the cursor out of a point.
   * @param event.target - The pointer event target
   * @returns {void}
   */
  const handleClosestPointOut = ({ target }: PointerEvent) => {
    if (target instanceof SVGElement && target.classList.contains("cursor-point")) {
      // Debounce hide to prevent flicker on rapid pointer transitions
      if (hideTooltipTimeout) clearTimeout(hideTooltipTimeout);
      hideTooltipTimeout = setTimeout(() => {
        tooltip.hide();
        lastTooltipDatum = null;
      }, TOOLTIP_HIDE_DELAY);
    }
  };

  /**
   * The main chart function that renders the time visualization.
   * @description
   * It sets up the SVG element, scales, axes, grids, series, and cursor.
   * @param {Selection<SVGElement, unknown, null, undefined>} selection - The D3 selection of the SVG element.
   * @returns {void}
   * @example
   * ```ts
   * const svg = d3.select("svg");
   * const chart = createTimeVizChart();
   * chart(svg);
   * ```
   */

  const chart = (
    selection: Selection<SVGElement, unknown, null, undefined>
  ) => {
    // User-friendly error handling for required properties
    if (!config) {
      console.warn("[d3-time-viz] Chart config is missing. Use .config() to set it before rendering.");
      return;
    }
    if (!series || !Array.isArray(series) || !series.length) {
      console.warn("[d3-time-viz] Chart series is missing or empty. Use .series() to set it before rendering.");
      return;
    }
    if (!data || !Array.isArray(data) || !data.length) {
      console.warn("[d3-time-viz] Chart data is missing or empty. Use .data() to set it before rendering.");
      return;
    }
    if (typeof xSerie !== 'function') {
      console.warn("[d3-time-viz] xSerie accessor is missing. Use .xSerie() to set it before rendering.");
      return;
    }
    if (!colorScale || typeof colorScale !== 'function' || typeof colorScale.domain !== 'function' || typeof colorScale.range !== 'function') {
      console.warn("[d3-time-viz] colorScale is missing or invalid. Use .colorScale() to set a valid D3 scaleOrdinal before rendering.");
      return;
    }

    const { width, height } = getSize(selection);
    if (!(width && height)) {
      console.warn("[d3-time-viz] SVG element has invalid width or height.");
      return;
    }
    selection.attr("viewBox", `0 0 ${width} ${height}`);
    innerWidth = width - (margin.left + margin.right);
    innerHeight = height - (margin.top + margin.bottom);
    if (innerWidth <= 0 && innerHeight <= 0) {
      console.warn("[d3-time-viz] Computed innerWidth and innerHeight are not positive.");
      return;
    }

    const xVals = data.map(xSerie);
    const [xMin, xMax] = d3.extent(xVals);
    if (!(xMin instanceof Date && xMax instanceof Date)) {
      console.warn("[d3-time-viz] xSerie must return Date objects for all data points.");
      return;
    }
    xScale = d3
      .scaleTime()
      .domain([xMin, xMax])
      .range([margin.left, innerWidth + margin.left])
      .nice();

    // Y scale (all series)
    const yVals = data.flatMap((d: ChartDataRow) =>
      series.map(({ accessor }: TimeVizSeriesConfig) => accessor(d))
    );

    const [yMin, yMax] = d3.extent(yVals);
    if (!(typeof yMin === "number" && typeof yMax === "number")) {
      console.warn("[d3-time-viz] Series accessors must return numbers for all data points.");
      return;
    }
    yScale = d3
      .scaleLinear()
      .domain([yMin, yMax])
      .range([innerHeight + margin.top, margin.top])
      .nice();

    selection
      .call(renderXAxis)
      .call(renderXGrid)
      .call(renderXAxisLabel)
      .call(renderYAxis)
      .call(renderYGrid)
      .call(renderYAxisLabel)
      .call(renderSeries)
      .call(renderLegend);

    // Cursor interaction (only if not static)
    if (isStatic) return;
    // Remove previous event listeners before adding new ones
    selection
      .on("pointermove", null)
      .on("pointerover", null)
      .on("pointerout", null);

    // Throttle pointermove handler for performance
    let lastMove = 0;
    const throttleMs = 16; // ~60fps
    const throttledPointerMove = (event: PointerEvent) => {
      const now = Date.now();
      if (now - lastMove > throttleMs) {
        handlePointerMoveCursor(event, selection);
        lastMove = now;
      }
    };

    selection
      .on("pointermove", throttledPointerMove)
      .on("pointerover", handleClosestPointOver)
      .on("pointerout", handleClosestPointOut);
  };


  chart.xSerie = (accessor: (d: ChartDataRow) => Date | number) => {
    if (typeof accessor !== 'function') {
      console.warn('xSerie accessor must be a function');
      return chart;
    }
    xSerie = accessor;
    return chart;
  };
  chart.config = (configuration: TimeVizConfig) => {
    if (typeof configuration !== 'object' || configuration == null) {
      console.warn('config must be an object');
      return chart;
    }
    config = configuration;
    return chart;
  };
  chart.series = (fields: TimeVizSeriesConfig[]) => {
    if (!Array.isArray(fields)) {
      console.warn('series must be an array');
      return chart;
    }
    series = fields;
    return chart;
  };
  chart.data = (dataset: ChartDataRow[]) => {
    if (!Array.isArray(dataset)) {
      console.warn('data must be an array');
      return chart;
    }
    data = dataset;
    return chart;
  };
  chart.colorScale = (color: ScaleOrdinal<string, string>) => {
    if (typeof color !== 'function' || typeof color.domain !== 'function' || typeof color.range !== 'function') {
      console.warn('colorScale must be a valid D3 scaleOrdinal');
      return chart;
    }
    colorScale = color;
    return chart;
  };
  chart.isCurved = (bool: boolean) => {
    if (typeof bool !== 'boolean') {
      console.warn('isCurved must be a boolean');
      return chart;
    }
    isCurved = bool;
    return chart;
  };
  chart.isStatic = (bool: boolean) => {
    if (typeof bool !== 'boolean') {
      console.warn('isStatic must be a boolean');
      return chart;
    }
    isStatic = bool;
    return chart;
  };
  chart.transitionTime = (time: number) => {
    if (typeof time !== 'number' || time < 0) {
      console.warn('transitionTime must be a non-negative number');
      return chart;
    }
    transitionTime = time;
    return chart;
  };
  chart.xTicks = (quantity: number) => {
    if (typeof quantity !== 'number' || quantity < 0) {
      console.warn('xTicks must be a non-negative number');
      return chart;
    }
    xTicks = quantity;
    return chart;
  };
  chart.yTicks = (quantity: number) => {
    if (typeof quantity !== 'number' || quantity < 0) {
      console.warn('yTicks must be a non-negative number');
      return chart;
    }
    yTicks = quantity;
    return chart;
  };
  chart.margin = (marg: MarginConfig) => {
    if (typeof marg !== 'object' || marg == null) {
      console.warn('margin must be an object');
      return chart;
    }
    margin = { ...margin, ...marg };
    return chart;
  };
  chart.formatXAxis = (format: string) => {
    if (typeof format !== 'string') {
      console.warn('formatXAxis must be a string');
      return chart;
    }
    formatXAxis = format;
    return chart;
  };
  chart.formatYAxis = (format: string) => {
    if (typeof format !== 'string') {
      console.warn('formatYAxis must be a string');
      return chart;
    }
    formatYAxis = format;
    return chart;
  };
  chart.yAxisLabel = (label: string) => {
    if (typeof label !== 'string') {
      console.warn('yAxisLabel must be a string');
      return chart;
    }
    yAxisLabel = label;
    return chart;
  };
  chart.xAxisLabel = (label: string) => {
    if (typeof label !== 'string') {
      console.warn('xAxisLabel must be a string');
      return chart;
    }
    xAxisLabel = label;
    return chart;
  };
  chart.tooltip = (tooltipInstance: TipVizTooltip) => {
    if (typeof tooltipInstance !== 'object' || tooltipInstance == null) {
      console.warn('tooltip must be a valid TipVizTooltip instance');
      return chart;
    }
    tooltip = tooltipInstance;
    return chart;
  };

  /**
   * Set multiple chart options at once for improved chainability and clarity.
   * Accepts a partial config object with any supported builder options.
   */
  chart.setOptions = (options: Partial<TimeVizConfig> & {
    series?: TimeVizSeriesConfig[];
    data?: ChartDataRow[];
    colorScale?: ScaleOrdinal<string, string>;
    isCurved?: boolean;
    isStatic?: boolean;
    transitionTime?: number;
    xTicks?: number;
    yTicks?: number;
    margin?: MarginConfig;
    formatXAxis?: string;
    formatYAxis?: string;
    yAxisLabel?: string;
    xAxisLabel?: string;
    tooltip?: TipVizTooltip;
    xSerie?: (d: ChartDataRow) => Date | number;
  }) => {
    if (options.series && !Array.isArray(options.series)) {
      console.warn('series must be an array');
    } else if (options.series) {
      series = options.series;
    }
    if (options.data && !Array.isArray(options.data)) {
      console.warn('data must be an array');
    } else if (options.data) {
      data = options.data;
    }
    if (options.colorScale && (typeof options.colorScale !== 'function' || typeof options.colorScale.domain !== 'function' || typeof options.colorScale.range !== 'function')) {
      console.warn('colorScale must be a valid D3 scaleOrdinal');
    } else if (options.colorScale) {
      colorScale = options.colorScale;
    }
    if (typeof options.isCurved !== 'undefined' && typeof options.isCurved !== 'boolean') {
      console.warn('isCurved must be a boolean');
    } else if (typeof options.isCurved === 'boolean') {
      isCurved = options.isCurved;
    }
    if (typeof options.isStatic !== 'undefined' && typeof options.isStatic !== 'boolean') {
      console.warn('isStatic must be a boolean');
    } else if (typeof options.isStatic === 'boolean') {
      isStatic = options.isStatic;
    }
    if (typeof options.transitionTime !== 'undefined' && (typeof options.transitionTime !== 'number' || options.transitionTime < 0)) {
      console.warn('transitionTime must be a non-negative number');
    } else if (typeof options.transitionTime === 'number') {
      transitionTime = options.transitionTime;
    }
    if (typeof options.xTicks !== 'undefined' && (typeof options.xTicks !== 'number' || options.xTicks < 0)) {
      console.warn('xTicks must be a non-negative number');
    } else if (typeof options.xTicks === 'number') {
      xTicks = options.xTicks;
    }
    if (typeof options.yTicks !== 'undefined' && (typeof options.yTicks !== 'number' || options.yTicks < 0)) {
      console.warn('yTicks must be a non-negative number');
    } else if (typeof options.yTicks === 'number') {
      yTicks = options.yTicks;
    }
    if (options.margin && (typeof options.margin !== 'object' || options.margin == null)) {
      console.warn('margin must be an object');
    } else if (options.margin) {
      margin = { ...margin, ...options.margin };
    }
    if (typeof options.formatXAxis !== 'undefined' && typeof options.formatXAxis !== 'string') {
      console.warn('formatXAxis must be a string');
    } else if (typeof options.formatXAxis === 'string') {
      formatXAxis = options.formatXAxis;
    }
    if (typeof options.formatYAxis !== 'undefined' && typeof options.formatYAxis !== 'string') {
      console.warn('formatYAxis must be a string');
    } else if (typeof options.formatYAxis === 'string') {
      formatYAxis = options.formatYAxis;
    }
    if (typeof options.yAxisLabel !== 'undefined' && typeof options.yAxisLabel !== 'string') {
      console.warn('yAxisLabel must be a string');
    } else if (typeof options.yAxisLabel === 'string') {
      yAxisLabel = options.yAxisLabel;
    }
    if (typeof options.xAxisLabel !== 'undefined' && typeof options.xAxisLabel !== 'string') {
      console.warn('xAxisLabel must be a string');
    } else if (typeof options.xAxisLabel === 'string') {
      xAxisLabel = options.xAxisLabel;
    }
    if (options.tooltip && (typeof options.tooltip !== 'object' || options.tooltip == null)) {
      console.warn('tooltip must be a valid TipVizTooltip instance');
    } else if (options.tooltip) {
      tooltip = options.tooltip;
    }
    if (options.xSerie && typeof options.xSerie !== 'function') {
      console.warn('xSerie accessor must be a function');
    } else if (options.xSerie) {
      xSerie = options.xSerie;
    }
    return chart;
  };

  return chart;
};
