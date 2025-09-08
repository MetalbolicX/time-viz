import type {
  Selection,
  ScaleOrdinal,
  ScaleLinear,
  ScaleTime,
  BrushBehavior,
} from "d3";
import type { ChartDataRow, TimeVizSeriesConfig, MarginConfig } from "@/types";
import type { TipVizTooltip } from "tipviz";

export interface ChartContext {
  // D3 selection and SVG dimensions
  selection: Selection<SVGElement, unknown, null, undefined>;
  innerWidth: number;
  innerHeight: number;

  // Data and series configuration
  data: ChartDataRow[];
  series: TimeVizSeriesConfig[];
  xSerie: (d: ChartDataRow) => Date;

  // Scales
  xScale: ScaleTime<number, number>;
  yScale: ScaleLinear<number, number>;
  colorScale: ScaleOrdinal<string, string>;

  // Layout and styling
  margin: MarginConfig;

  // Axis configuration
  xTicks: number;
  yTicks: number;
  formatXAxis: string;
  formatYAxis: string;
  xAxisLabel: string;
  yAxisLabel: string;

  // Behavior configuration
  isCurved: boolean;
  isStatic: boolean;
  transitionTime: number;

  // Interactive elements
  tooltip: TipVizTooltip;

  // Brush and zoom state (optional for some renderers)
  brush?: BrushBehavior<unknown>;
  originalXDomain?: [number, number] | null;
  isZoomed?: boolean;
  idleTimeout?: any;
}
