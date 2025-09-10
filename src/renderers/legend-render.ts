import { ChartContext } from "@/types";

/**
 * Renders the legend for the chart.
 * @param ctx - Chart context
 * @returns void
 */
export const renderLegend = (ctx: ChartContext): void => {
  if (!ctx.series?.length) return;

  const legendGroup = ctx.selection
    .selectAll(".legend")
    .data([null])
    .join("g")
    .attr("class", "legend")
    .attr(
      "transform",
      `translate(${ctx.innerWidth / 2 - ctx.margin.left}, ${
        ctx.margin.top / 2
      })`
    );

  const itemWidth = 100;

  legendGroup
    .selectAll(".legend-item")
    .data(ctx.series)
    .join("g")
    .attr("class", "legend-item")
    .attr("transform", (_, i) => `translate(${i * itemWidth}, 0)`)
    .call(group => {
      group
        .selectAll("rect")
        .data(d => [d])
        .join("rect")
        .attr("class", "legend-square")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 12)
        .attr("height", 12)
        .style("fill", ({ color, label }) => color || ctx.colorScale(label));

      group
        .selectAll("text")
        .data(d => [d])
        .join("text")
        .attr("class", "legend-label")
        .attr("x", 16)
        .attr("y", 10)
        .text(({ label }) => label)
    });
};
