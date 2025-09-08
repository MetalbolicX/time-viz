export type ChartEventType =
  | "data-changed"
  | "series-changed"
  | "config-changed"
  | "render-complete"
  | "interaction-start"
  | "interaction-end";

export interface ChartEventData {
  "data-changed": { data: any[]; timestamp: number };
  "series-changed": { selectedSeries: string; hiddenSeries: Set<string> };
  "config-changed": { config: any };
  "render-complete": { renderTime: number };
  "interaction-start": { type: string };
  "interaction-end": { type: string };
}
