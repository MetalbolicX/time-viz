export type ChartDataRow = Record<string, unknown>;

export interface TimeVizSeriesConfig<T = ChartDataRow> {
  accessor: (row: T) => number;
  label: string;
  color?: string;
  format?: string;
}

export interface TimeVizConfig<T = ChartDataRow> {
  data: T[];
  xSerie: {
    accessor: (row: T) => Date | number;
    label?: string;
    format?: string;
  };
  ySeries: Array<TimeVizSeriesConfig<T>>;
  margin?: MarginConfig;
  isStatic?: boolean;
  isCurved?: boolean;
  transitionTime?: number;
  xTicks?: number;
  yTicks?: number;
  formatXAxis?: string;
  formatYAxis?: string;
  chartTitle?: string;
}

export interface MarginConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
