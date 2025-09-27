import { pointer, bisector, select } from "d3";
import type { ChartDataRow, ChartContext } from "@/types";

/**
 * Renders the cursor for the chart.
 * @param ctx - Chart context
 * @param row - Data row for the current cursor position
 * @returns void
 */
export const renderCursor = (ctx: ChartContext, row: ChartDataRow): void => {
  if (ctx.isStatic) return;

  const seriesGroup = ctx.selection
    .selectAll(".series")
    .data([null])
    .join("g")
    .attr("class", "series");

  seriesGroup
    .selectAll(".series-group")
    .data(
      ctx.series.map(({ label, color, accessor }) => ({
        label,
        color: color || ctx.colorScale(label),
        x: ctx.xSerie(row),
        y: accessor(row),
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
    .attr("r", 4)
    .attr("cx", ({ x }) => ctx.xScale(x))
    .attr("cy", ({ y }) => ctx.yScale(y))
    .style("stroke", ({ color }) => color)
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr("aria-label", ({ label, x, y }) => `${label} - x: ${x}, y: ${y}`);

  seriesGroup
    .selectAll(".cursor.vertical-line")
    .data([row])
    .join("line")
    .attr("class", "cursor vertical-line")
    .attr("x1", ctx.xScale(ctx.xSerie(row)))
    .attr("y1", 0)
    .attr("x2", ctx.xScale(ctx.xSerie(row)))
    .attr("y2", ctx.innerHeight);
};

export const setupCursorEvents = (ctx: ChartContext): void => {
  if (ctx.isStatic) return;

  ctx.selection
    .on("pointermove", null)
    .on("pointerover", null)
    .on("pointerout", null);

  let lastCursorIdx: number | null = null;
  let lastTooltipDatum: ChartDataRow | null = null;
  let hideTooltipTimeout: any = null;
  const TOOLTIP_HIDE_DELAY = 50; // milliseconds

  const handlePointerMoveCursor = (event: PointerEvent) => {
    const [mouseX, mouseY] = pointer(event);
    const [xMinRange, xMaxRange] = ctx.xScale.range();
    const [yMaxRange, yMinRange] = ctx.yScale.range();

    // Check if mouse is within the chart area
    const isInChartArea =
      mouseX >= xMinRange &&
      mouseX <= xMaxRange &&
      mouseY >= yMinRange &&
      mouseY <= yMaxRange;

    if (!isInChartArea) {
      ctx.selection.selectAll(".cursor").classed("hidden", true);
      lastCursorIdx = null;
      return;
    }

    if (!ctx.data.length) return;

    const xValues = ctx.data.map(ctx.xSerie);
    const mouseDate = ctx.xScale.invert(mouseX);
    const bisect = bisector((d: number | Date) => d).center;
    const idx = bisect(xValues, mouseDate);
    const clampedIdx = Math.max(0, Math.min(ctx.data.length - 1, idx));
    if (clampedIdx === lastCursorIdx) return; // No change in index

    lastCursorIdx = clampedIdx;
    const row = ctx.data.at(clampedIdx);
    if (!row) return;
    renderCursor(ctx, row);
  };

  const handleClosestPointOver = ({ target }: PointerEvent) => {
    if (target instanceof SVGElement && target.classList.contains("point")) {
      const datum = select(target).datum() as ChartDataRow;
      if (hideTooltipTimeout) {
        clearTimeout(hideTooltipTimeout);
        hideTooltipTimeout = null;
      }

      if (datum !== lastTooltipDatum) {
        ctx.tooltip.show(datum, target);
        lastTooltipDatum = datum;
      }
    }
  };

  const handleClosestPointOut = ({ target }: PointerEvent) => {
    if (target instanceof SVGElement && target.classList.contains("point")) {
      if (hideTooltipTimeout) {
        clearTimeout(hideTooltipTimeout);
      }

      hideTooltipTimeout = setTimeout(() => {
        ctx.tooltip.hide();
        lastTooltipDatum = null;
      }, TOOLTIP_HIDE_DELAY);
    }
  };

  let lastMove = 0;
  const THROTTLE_DELAY = 16; // milliseconds

  const throttledPointerMove = (event: PointerEvent) => {
    const now = Date.now();
    if (now - lastMove >= THROTTLE_DELAY) {
      handlePointerMoveCursor(event);
      lastMove = now;
    }
  };

  ctx.selection
    .on("pointermove", throttledPointerMove)
    .on("pointerover", handleClosestPointOver)
    .on("pointerout", handleClosestPointOut);
};
