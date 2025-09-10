import { line, curveCatmullRom, select } from "d3";
import type { ChartContext } from "@/types";

/**
 * Renders the series in the chart.
 * @param ctx - Chart context
 * @returns void
 */
export const renderSeries = (ctx: ChartContext): void => {
  if (!ctx.series?.length && !ctx.data?.length) return;

  const lineGenerator = line<{ x: number | Date; y: number }>()
    .x(({ x }) => ctx.xScale(x))
    .y(({ y }) => ctx.yScale(y));

  ctx.isCurved && lineGenerator.curve(curveCatmullRom);

  const seriesGroup = ctx.selection
    .selectAll(".series")
    .data([null])
    .join("g")
    .attr("class", "series");

  seriesGroup
    .selectAll(".series-group")
    .data(ctx.series)
    .join("g")
    .attr("class", "series-group")
    .attr("data-label", ({ label }) => label)
    .selectAll("path.serie")
    .data(({ accessor, label, color }) => [
      {
        accessor,
        label,
        color: color || ctx.colorScale(label),
        coordinates: ctx.data.map((d) => ({
          x: ctx.xSerie(d),
          y: accessor(d),
        })),
      },
    ])
    .join(
      (enter) =>
        enter
          .append("path")
          .attr("class", "serie")
          .attr("d", ({ coordinates }) => lineGenerator(coordinates) || "")
          .style("stroke", ({ color }) => color)
          .each(function () {
            const path = select(this);
            const totalLength = (this as SVGPathElement).getTotalLength();
            path
              .attr("stroke-dasharray", totalLength)
              .attr("stroke-dashoffset", totalLength)
              .transition()
              .duration(ctx.transitionTime)
              .attr("stroke-dashoffset", 0);
          }),
      (update) => update.each(function () {
        select(this)
          .attr("stroke-dasharray", null)
          .attr("stroke-dashoffset", null);
      }).transition()
        .duration(ctx.transitionTime)
        .attr("d", ({ coordinates }) => lineGenerator(coordinates) || "")
        .style("stroke", ({ color }) => color),
      (exit) => exit.remove()
    );
};
