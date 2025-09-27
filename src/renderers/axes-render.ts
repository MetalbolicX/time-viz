import { axisBottom, axisLeft, format, timeFormat } from "d3";
import type { ChartContext } from "@/types";

/**
 * Renders the X axis on the chart using the provided context.
 * @param ctx - The chart context containing scales, dimensions, and selection.
 */
export const renderXAxis = (ctx: ChartContext): void => {
  const xAxis = axisBottom(ctx.xScale)
    .ticks(ctx.xTicks)
    .tickFormat(timeFormat(ctx.formatXAxis) as any);

  ctx.selection
    .selectAll(".x.axis")
    .data([null])
    .join("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0, ${ctx.innerHeight + ctx.margin.top})`)
    .call(xAxis as any);
};

/**
 * Renders the Y axis on the chart using the provided context.
 * @param ctx - The chart context containing scales, dimensions, and selection.
 */
export const renderYAxis = (ctx: ChartContext): void => {
  const yAxis = axisLeft(ctx.yScale)
    .ticks(ctx.yTicks)
    .tickFormat(format(ctx.formatYAxis) as any);

  ctx.selection
    .selectAll(".y.axis")
    .data([null])
    .join("g")
    .attr("class", "y axis")
    .attr("transform", `translate(${ctx.margin.left}, 0)`)
    .call(yAxis as any);
};

/**
 * Renders the X axis label on the chart using the provided context.
 * @param ctx - Chart context containing dimensions, margins, selection, and xAxisLabel.
 */
export const renderXAxisLabel = (ctx: ChartContext): void => {
  if (!ctx.xAxisLabel) return;

  ctx.selection
    .selectAll(".labels")
    .data([null])
    .join("g")
    .attr("class", "labels")
    .selectAll(".x.axis-label")
    .data([ctx.xAxisLabel])
    .join("text")
    .attr("class", "x axis-label")
    .attr("x", ctx.innerWidth / 2 + ctx.margin.left)
    .attr("y", ctx.innerHeight + ctx.margin.top)
    .attr("dy", "-0.5em")
    .text((d) => d);
};

/**
 * Renders the Y axis label on the chart using the provided context.
 * @param ctx - Chart context containing dimensions, margins, selection, and yAxisLabel.
 */
export const renderYAxisLabel = (ctx: ChartContext): void => {
  if (!ctx.yAxisLabel) return;

  ctx.selection
    .selectAll(".labels")
    .data([null])
    .join("g")
    .attr("class", "labels")
    .selectAll(".y.axis-label")
    .data([ctx.yAxisLabel])
    .join("text")
    .attr("class", "y axis-label")
    .attr("x", 0 * ctx.margin.left)
    .attr("y", ctx.margin.top)
    .attr("transform", `rotate(-90, ${ctx.margin.left}, ${ctx.margin.top})`)
    .attr("dy", "1em")
    .text((d) => d);
};
