export type ChartDataRow = Record<string, unknown>;

export interface TimeVizSeriesConfig<T = ChartDataRow> {
  accessor: (row: T) => number;
  label: string;
  color?: string;
}

export interface TimeVizConfig<T = ChartDataRow> {
  data: T[];
  xSerie: {
    accessor: (row: T) => Date | number;
    label?: string;
    // format?: string;
  };
  ySeries: Array<TimeVizSeriesConfig<T>>;
}

export interface MarginConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
