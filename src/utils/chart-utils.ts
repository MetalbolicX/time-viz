import { ChartContext } from "@/types";

/**
 * Validates the chart setup.
 * @param ctx - Chart context
 * @returns True if the setup is valid, false otherwise.
 */
export const validateSetup = (ctx: Partial<ChartContext>): boolean => {
  if (!ctx.series || !Array.isArray(ctx.series) || !ctx.series.length) {
    console.warn("[d3-line-viz] Chart series is missing or empty.");
    return false;
  }

  if (!ctx.data || !Array.isArray(ctx.data) || !ctx.data.length) {
    console.warn("[d3-line-viz] Chart data is missing or empty.");
    return false;
  }

  if (typeof ctx.xSerie !== "function") {
    console.warn("[d3-line-viz] xSerie accessor is missing.");
    return false;
  }

  if (
    !ctx.colorScale ||
    typeof ctx.colorScale !== "function" ||
    typeof ctx.colorScale.domain !== "function" ||
    typeof ctx.colorScale.range !== "function"
  ) {
    console.warn("[d3-line-viz] colorScale is missing or invalid.");
    return false;
  }

  return true;
};
