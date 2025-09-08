export interface MarginConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ChartConfig {
  transitionTime: number;
  xTicks: number;
  yTicks: number;
  margin: MarginConfig;
  formatXAxis: string;
  formatYAxis: string;
  yAxisLabel: string;
  xAxisLabel: string;
  isCurved: boolean;
  isStatic: boolean;
}
