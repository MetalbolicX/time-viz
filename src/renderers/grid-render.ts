import { ChartContext } from "@/types";

/**
 * Renders the x grid lines for the chart.
 * @param ctx - Chart context
 * @returns void
 */
export const renderXGrid = (ctx: ChartContext): void => {
  const [yMin, yMax] = ctx.yScale.domain();

  ctx.selection
    .selectAll(".grids")
    .data([null])
    .join("g")
    .attr("class", "grids")
    .selectAll(".x.grid")
    .data(ctx.xScale.ticks(ctx.xTicks))
    .join("line")
    .attr("class", "x grid")
    .attr("x1", (d) => ctx.xScale(d))
    .attr("y1", ctx.yScale(yMin))
    .attr("x2", (d) => ctx.xScale(d))
    .attr("y2", ctx.yScale(yMax));
};

/**
 * Renders the y grid lines for the chart.
 * @param ctx - Chart context
 * @returns void
 */
export const renderYGrid = (ctx: ChartContext): void => {
  const [xMin, xMax] = ctx.xScale.domain();

  ctx.selection
    .selectAll(".grids")
    .data([null])
    .join("g")
    .attr("class", "grids")
    .selectAll(".y.grid")
    .data(ctx.yScale.ticks(ctx.yTicks))
    .join("line")
    .attr("class", "y grid")
    .attr("x1", ctx.xScale(xMin))
    .attr("y1", (d) => ctx.yScale(d))
    .attr("x2", ctx.xScale(xMax))
    .attr("y2", (d) => ctx.yScale(d));
}
