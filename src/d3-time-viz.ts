import { scaleTime, scaleLinear } from "d3";
import type { Selection, ScaleOrdinal } from "d3";
import type { TimeVizSeriesConfig, ChartDataRow, MarginConfig } from "@/types";
import type { TipVizTooltip } from "tipviz";
import {
  renderXAxis,
  renderYAxis,
  renderXGrid,
  renderYGrid,
  renderSeries,
  renderYAxisLabel,
  renderXAxisLabel,
  renderLegend,
  setupCursorEvents,
} from "@/renderers";

import { ConfigurationManager, ChartDimensions, DataService } from "@/services";
import type { ChartContext } from "@/types";
import { validateSetup } from "@/utils";

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
  const defaultConfig = ConfigurationManager.getDefaultConfig();
  const ctx: Partial<ChartContext> = {
    isCurved: defaultConfig.isCurved,
    isStatic: defaultConfig.isStatic,
    transitionTime: defaultConfig.transitionTime,
    xTicks: defaultConfig.xTicks,
    yTicks: defaultConfig.yTicks,
    margin: { ...defaultConfig.margin },
    formatXAxis: defaultConfig.formatXAxis,
    formatYAxis: defaultConfig.formatYAxis,
    yAxisLabel: defaultConfig.yAxisLabel,
    xAxisLabel: defaultConfig.xAxisLabel,
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
    if (!validateSetup(ctx)) {
      console.warn("[d3-time-viz] Chart setup is invalid.");
      return;
    }

    const dimensions = new ChartDimensions(
      selection.node() as SVGElement,
      ctx.margin!
    );
    if (!dimensions.areValidDimensions) {
      console.warn("[d3-time-viz] SVG element has non-positive dimensions.");
      return;
    }

    const { width, height, innerHeight, innerWidth } = dimensions;

    ctx.innerHeight = innerHeight;
    ctx.innerWidth = innerWidth;
    ctx.selection = selection;

    ctx.selection.attr("viewBox", `0 0 ${width} ${height}`);

    const xDomain = DataService.getDataDomain(ctx.data!, [ctx.xSerie! as any]);
    if (!xDomain) {
      console.warn(
        "[d3-time-viz] xSerie must return Dates for all data points."
      );
      return;
    }

    ctx.xScale = scaleTime()
      .domain(xDomain)
      .range(dimensions.innerXRange)
      .nice();

    const yDomain = DataService.getDataDomain(
      ctx.data!,
      ctx.series!.map((s) => s.accessor)
    );

    if (!yDomain) {
      console.warn(
        "[d3-time-viz] Series accessors must return numbers for all data points."
      );
      return;
    }

    ctx.yScale = scaleLinear()
      .domain(yDomain)
      .range(dimensions.innerYRange)
      .nice();

    const fullCtx = ctx as ChartContext;

    renderXAxis(fullCtx);
    renderXGrid(fullCtx);
    renderXAxisLabel(fullCtx);
    renderYAxis(fullCtx);
    renderYGrid(fullCtx);
    renderYAxisLabel(fullCtx);
    renderSeries(fullCtx);
    renderLegend(fullCtx);
    setupCursorEvents(fullCtx);
  };

  /**
   * Sets the x-axis accessor function.
   * @param accessor - A function that extracts the x value from a data row.
   * @returns The chart instance for chaining.
   */
  chart.xSerie = (accessor: (d: ChartDataRow) => Date) => {
    if (typeof accessor !== "function") {
      console.warn("xSerie accessor must be a function");
      return chart;
    }
    ctx.xSerie = accessor;
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
    ctx.series = fields;
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
    ctx.data = dataset;
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
    ctx.colorScale = color;
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
    ctx.isCurved = bool;
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
    ctx.isStatic = bool;
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
    ctx.transitionTime = time;
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
    ctx.xTicks = quantity;
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
    ctx.yTicks = quantity;
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
    ctx.margin = { ...ctx.margin, ...marg };
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
    ctx.formatXAxis = format;
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
    ctx.formatYAxis = format;
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
    ctx.yAxisLabel = label;
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
    ctx.xAxisLabel = label;
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
    ctx.tooltip = tooltipInstance;
    return chart;
  };

  return chart;
};
