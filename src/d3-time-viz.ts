import * as d3 from "d3";
import type { Selection, ScaleOrdinal } from "d3";
import type { TimeVizSeriesConfig, ChartDataRow, MarginConfig } from "./types";
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
    if (!(series?.length && data?.length)) return;

    const line = d3
      .line<{ x: number | Date; y: number }>()
      .x(({ x }) => xScale(x))
      .y(({ y }) => yScale(y));
    isCurved && line.curve(d3.curveCatmullRom);

    // Create a group for all series
    const seriesGroup = selection
      .selectAll(".series")
      .data([null])
      .join("g")
      .attr("class", "series");

    // For each series, create a group and a single path inside it
    const group = seriesGroup
      .selectAll<SVGGElement, TimeVizSeriesConfig>(".series-group")
      .data(series)
      .join("g")
      .attr("class", "series-group")
      .attr("data-label", ({ label }) => label);

    group
      .selectAll<SVGPathElement, TimeVizSeriesConfig>("path.serie")
      .data(({ label, accessor, color }) => [
        {
          label,
          color: color || colorScale(label),
          coordinates: data.map((row) => ({
            x: xSerie(row),
            y: accessor(row),
          })),
        },
      ])
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("class", "serie")
            .attr("data-label", ({ label }) => label)
            .attr("d", ({ coordinates }) => line(coordinates))
            .style("stroke", ({ color }) => color)
            .each(function () {
              const path = d3.select(this);
              const totalLength = (this as SVGPathElement).getTotalLength();
              path
                .attr("stroke-dasharray", totalLength)
                .attr("stroke-dashoffset", totalLength)
                .transition()
                .duration(transitionTime)
                .attr("stroke-dashoffset", 0);
            }),
        (update) =>
          update
            .each(function () {
              // clear stroke-dash settings that were added by the enter animation
              d3.select(this)
                .attr("stroke-dasharray", null)
                .attr("stroke-dashoffset", null);
            })
            .transition()
            .duration(transitionTime)
            .style("stroke", ({ color }) => color)
            .attr("d", ({ coordinates }) => line(coordinates)),
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
    const seriesGroup = selection
      .selectAll(".series")
      .data([null])
      .join("g")
      .attr("class", "series");

    seriesGroup
      .selectAll(".series-group")
      .data(
        series.map(({ label, color, accessor }) => ({
          label,
          color: color || colorScale(label),
          x: xSerie(closestRow),
          y: accessor(closestRow),
        }))
      )
      .join("g")
      .attr("class", "series-group")
      .attr("data-label", ({ label }) => label)
      .selectAll(".cursor.point")
      .data(({ x, y, color, label }) => [{ x, y, color, label }])
      .join("circle")
      .attr("class", "cursor point")
      .attr("data-label", ({ label }) => label)
      .attr("cx", ({ x }) => xScale(x))
      .attr("cy", ({ y }) => yScale(y))
      .attr("r", 4)
      .style("stroke", ({ color }) => color)
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr(
        "aria-label",
        ({ label, x, y }) => `Data point for ${label}, x: ${x}, y: ${y}`
      );

    seriesGroup
      .selectAll(".cursor.vertical-line")
      .data([closestRow])
      .join("line")
      .attr("class", "cursor vertical-line")
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
    if (!series?.length) return;

    // Place legend at top right, horizontally
    const legendGroup = selection
      .selectAll("g.legend")
      .data([null])
      .join("g")
      .attr("class", "legend")
      .attr(
        "transform",
        `translate(${innerWidth / 2 - margin.left}, ${margin.top / 2})`
      ); // move to top left, adjust as needed

    // Horizontal layout: each item is offset by its width
    const itemWidth = 100; // px, adjust as needed
    legendGroup
      .selectAll(".legend-item")
      .data(series)
      .join("g")
      .attr("class", "legend-item")
      .attr("data-label", ({ label }) => label)
      .attr("transform", (_, i) => `translate(${i * itemWidth}, 0)`)
      .call((group) => {
        group
          .selectAll("rect")
          .data((d) => [d])
          .join("rect")
          .attr("class", "legend-square")
          .attr("x", 0)
          .attr("y", 0)
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
      selection.selectAll(".cursor").classed("hidden", true);
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
    if (target instanceof SVGElement && target.classList.contains("point")) {
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
    if (target instanceof SVGElement && target.classList.contains("point")) {
      // Debounce hide to prevent flicker on rapid pointer transitions
      if (hideTooltipTimeout) clearTimeout(hideTooltipTimeout);
      hideTooltipTimeout = setTimeout(() => {
        tooltip.hide();
        lastTooltipDatum = null;
      }, TOOLTIP_HIDE_DELAY);
    }
  };

  const setupChartEventListeners = (
    selection: Selection<SVGElement, unknown, null, undefined>
  ) => {
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

  const validateSetup = (): boolean => {
    if (!series || !Array.isArray(series) || !series.length) {
      console.warn("[d3-time-viz] Chart series is missing or empty.");
      return false;
    }
    if (!data || !Array.isArray(data) || !data.length) {
      console.warn("[d3-time-viz] Chart data is missing or empty.");
      return false;
    }
    if (typeof xSerie !== "function") {
      console.warn("[d3-time-viz] xSerie accessor is missing.");
      return false;
    }
    if (
      !colorScale ||
      typeof colorScale !== "function" ||
      typeof colorScale.domain !== "function" ||
      typeof colorScale.range !== "function"
    ) {
      console.warn("[d3-time-viz] colorScale is missing or invalid.");
      return false;
    }
    return true;
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
   * svg.call(chart);
   * ```
   */
  const chart = (
    selection: Selection<SVGElement, unknown, null, undefined>
  ) => {
    if (!validateSetup()) {
      console.warn("[d3-time-viz] Chart setup is invalid.");
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
    if (innerWidth <= 0 || innerHeight <= 0) {
      console.warn("[d3-time-viz] SVG element has non-positive dimensions.");
      return;
    }

    const xVals = data.map(xSerie);
    const [xMin, xMax] = d3.extent(xVals);
    if (!(xMin instanceof Date && xMax instanceof Date)) {
      console.warn(
        "[d3-time-viz] xSerie must return Date objects for all data points."
      );
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
      console.warn(
        "[d3-time-viz] Series accessors must return numbers for all data points."
      );
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

    setupChartEventListeners(selection);
  };

  /**
   * Sets the x-axis accessor function.
   * @param accessor - A function that extracts the x value from a data row.
   * @returns The chart instance for chaining.
   */
  chart.xSerie = (accessor: (d: ChartDataRow) => Date | number) => {
    if (typeof accessor !== "function") {
      console.warn("xSerie accessor must be a function");
      return chart;
    }
    xSerie = accessor;
    return chart;
  };

  /**
   * Sets the series configuration.
   * @param fields - An array of series configurations.
   * @returns The chart instance for chaining.
   */
  chart.series = (fields: TimeVizSeriesConfig[]) => {
    if (!Array.isArray(fields)) {
      console.warn("series must be an array");
      return chart;
    }
    series = fields;
    return chart;
  };

  /**
   * Sets the data for the chart.
   * @param dataset - An array of data rows.
   * @returns The chart instance for chaining.
   */
  chart.data = (dataset: ChartDataRow[]) => {
    if (!Array.isArray(dataset)) {
      console.warn("data must be an array");
      return chart;
    }
    data = dataset;
    return chart;
  };

  /**
   * Sets the color scale for the chart.
   * @param color - A D3 scaleOrdinal function for mapping data values to colors.
   * @returns The chart instance for chaining.
   */
  chart.colorScale = (color: ScaleOrdinal<string, string>) => {
    if (
      typeof color !== "function" ||
      typeof color.domain !== "function" ||
      typeof color.range !== "function"
    ) {
      console.warn("colorScale must be a valid D3 scaleOrdinal");
      return chart;
    }
    colorScale = color;
    return chart;
  };

  /**
   * Sets the curve interpolation for the line series.
   * @param bool - A boolean indicating whether the line should be curved.
   * @returns The chart instance for chaining.
   */
  chart.isCurved = (bool: boolean) => {
    if (typeof bool !== "boolean") {
      console.warn("isCurved must be a boolean");
      return chart;
    }
    isCurved = bool;
    return chart;
  };

  /**
   * Sets the static state of the chart.
   * @param bool - A boolean indicating whether the chart should be static.
   * @returns The chart instance for chaining.
   */
  chart.isStatic = (bool: boolean) => {
    if (typeof bool !== "boolean") {
      console.warn("isStatic must be a boolean");
      return chart;
    }
    isStatic = bool;
    return chart;
  };

  /**
   * Sets the transition time for the chart.
   * @param time - The transition time in milliseconds.
   * @returns The chart instance for chaining.
   */
  chart.transitionTime = (time: number) => {
    if (typeof time !== "number" || time < 0) {
      console.warn("transitionTime must be a non-negative number");
      return chart;
    }
    transitionTime = time;
    return chart;
  };

  /**
   * Sets the number of ticks on the x-axis.
   * @param quantity - The number of ticks.
   * @returns The chart instance for chaining.
   */
  chart.xTicks = (quantity: number) => {
    if (typeof quantity !== "number" || quantity < 0) {
      console.warn("xTicks must be a non-negative number");
      return chart;
    }
    xTicks = quantity;
    return chart;
  };

  /**
   * Sets the number of ticks on the y-axis.
   * @param quantity - The number of ticks.
   * @returns The chart instance for chaining.
   */
  chart.yTicks = (quantity: number) => {
    if (typeof quantity !== "number" || quantity < 0) {
      console.warn("yTicks must be a non-negative number");
      return chart;
    }
    yTicks = quantity;
    return chart;
  };

  /**
   * Sets the margin for the chart.
   * @param marg - An object specifying the margin values.
   * @returns The chart instance for chaining.
   */
  chart.margin = (marg: MarginConfig) => {
    if (typeof marg !== "object" || marg == null) {
      console.warn("margin must be an object");
      return chart;
    }
    margin = { ...margin, ...marg };
    return chart;
  };

  /**
   * Sets the format for the x-axis ticks.
   * @param format - A string specifying the tick format.
   * @returns The chart instance for chaining.
   */
  chart.formatXAxis = (format: string) => {
    if (typeof format !== "string") {
      console.warn("formatXAxis must be a string");
      return chart;
    }
    formatXAxis = format;
    return chart;
  };

  /**
   * Sets the format for the y-axis ticks.
   * @param format - A string specifying the tick format.
   * @returns The chart instance for chaining.
   */
  chart.formatYAxis = (format: string) => {
    if (typeof format !== "string") {
      console.warn("formatYAxis must be a string");
      return chart;
    }
    formatYAxis = format;
    return chart;
  };

  /**
   * Sets the label for the y-axis.
   * @param label - A string specifying the y-axis label.
   * @returns The chart instance for chaining.
   */
  chart.yAxisLabel = (label: string) => {
    if (typeof label !== "string") {
      console.warn("yAxisLabel must be a string");
      return chart;
    }
    yAxisLabel = label;
    return chart;
  };

  /**
   * Sets the label for the x-axis.
   * @param label - A string specifying the x-axis label.
   * @returns The chart instance for chaining.
   */
  chart.xAxisLabel = (label: string) => {
    if (typeof label !== "string") {
      console.warn("xAxisLabel must be a string");
      return chart;
    }
    xAxisLabel = label;
    return chart;
  };

  /**
   * Sets the tooltip for the chart.
   * @param tooltipInstance - A valid TipVizTooltip instance.
   * @returns The chart instance for chaining.
   */
  chart.tooltip = (tooltipInstance: TipVizTooltip) => {
    if (typeof tooltipInstance !== "object" || tooltipInstance == null) {
      console.warn("tooltip must be a valid TipVizTooltip instance");
      return chart;
    }
    tooltip = tooltipInstance;
    return chart;
  };

  return chart;
};
