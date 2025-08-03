import * as d3 from "d3";
import type { Selection, ScaleOrdinal } from "d3";
import type { TimeVizConfig, TimeVizSeriesConfig, ChartDataRow } from "./types";

export const createTimeVizChart = () => {
  let config: TimeVizConfig;
  let series: TimeVizSeriesConfig[];
  let data: ChartDataRow[];
  let colorScale: d3.ScaleOrdinal<string, string>;
  let isCurved: boolean;
  let isStatic: boolean;

  const chart = (
    selection: Selection<SVGElement, unknown, null, undefined>
  ) => {
    // selection.selectAll("*").remove();
    if (!config || !series?.length || !data?.length) return;

    const margin = config.margin ?? {
      top: 40,
      right: 80,
      bottom: 60,
      left: 60,
    };
    const containerRect = selection.node()?.getBoundingClientRect();
    if (!containerRect) return;
    const width = containerRect.width - margin.left - margin.right;
    const height = containerRect.height - margin.top - margin.bottom;
    if (width <= 0 || height <= 0) return;

    const main = selection
      .selectAll("g.main")
      .data([null])
      .join("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // X scale (time only)
    const xVals = data.map(config.x.accessor);
    const [xMin, xMax] = d3.extent(xVals);
    if (!(xMin instanceof Date && xMax instanceof Date)) return;
    const xScale = d3.scaleTime().domain([xMin, xMax]).range([0, width]);

    // Y scale (all series)
    const yVals = data.flatMap((row: ChartDataRow) =>
      series.map((s: TimeVizSeriesConfig) => s.accessor(row))
    );
    const [yMin, yMax] = d3.extent(yVals);
    if (typeof yMin !== "number" || typeof yMax !== "number") return;
    const yScale = d3
      .scaleLinear()
      .domain([yMin, yMax])
      .nice()
      .range([height, 0]);

    // Grid
    const xGrid = d3
      .axisBottom(xScale)
      .tickSize(-height)
      .tickFormat(() => "");
    const yGrid = d3
      .axisLeft(yScale)
      .tickSize(-width)
      .tickFormat(() => "");

    main
      .selectAll("g.x.grid")
      .data([null])
      .join("g")
      .attr("class", "x grid")
      .attr("transform", `translate(0,${height})`)
      .call(xGrid as any);

    main
      .selectAll("g.y.grid")
      .data([null])
      .join("g")
      .attr("class", "y grid")
      .call(yGrid as any);

    // Axes
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(config.xTicks ?? 5)
      .tickFormat(d3.timeFormat(config.formatXAxis ?? "%Y-%m-%d") as any);

    const yAxis = d3
      .axisLeft(yScale)
      .ticks(config.yTicks ?? 5)
      .tickFormat(d3.timeFormat(config.formatYAxis ?? ".2f") as any);

    main
      .selectAll("g.x.axis")
      .data([null])
      .join("g")
      .attr("class", "x axis")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis as any);

    main
      .selectAll("g.y.axis")
      .data([null])
      .join("g")
      .attr("class", "y axis")
      .call(yAxis as any);

    // Draw lines for each series
    const dataset = series.map((serie) =>
      data.map((d) => ({
        x: config.x.accessor(d),
        y: serie.accessor(d),
        label: serie.label,
        color: serie.color || colorScale(serie.label),
      }))
    );

    const line = d3
    .line<{ x: number; y: number }>()
    .x((d) => xScale(d.x))
    .y((d) => yScale(d.y));

    isCurved && line.curve(d3.curveCatmullRom);

    main
      .selectAll(".series")
      .data([null])
      .join("g")
      .attr("class", "series")
      .selectAll("path.serie")
      .data(dataset)
      .join("path")
      .attr("class", "serie")
      .attr("data-label", ([{ label }]) => label)
      .attr("d", (d) => line(d as { x: number; y: number }[]))
      .style("stroke", ([{ color }]) => color);

    // Cursor interaction (only if not static)
    if (!isStatic) {
      // ...cursor logic can be added here if needed...
    }
    // Legend and other features can be added similarly
  };

  chart.config = (v: TimeVizConfig) => ((config = v), chart);
  chart.series = (v: TimeVizSeriesConfig[]) => ((series = v), chart);
  chart.data = (v: ChartDataRow[]) => ((data = v), chart);
  chart.colorScale = (v: ScaleOrdinal<string, string>) => (
    (colorScale = v), chart
  );
  chart.isCurved = (v: boolean) => ((isCurved = v), chart);
  chart.isStatic = (v: boolean) => ((isStatic = v), chart);

  return chart;
};
