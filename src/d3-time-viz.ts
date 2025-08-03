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
      top: 30,
      right: 40,
      bottom: 30,
      left: 40,
    };

    const { width = 0, height = 0 } =
      selection.node()?.getBoundingClientRect() || {};
    if (!width || !height) return;
    const innerWidth = width - (margin.left + margin.right);
    const innerHeight = height - (margin.top + margin.bottom);
    if (innerWidth <= 0 && innerHeight <= 0) return;

    const mainGroup = selection
      .selectAll("g.main")
      .data([null])
      .join("g")
      .attr("class", "main")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
    // X scale (time only)
    const xVals = data.map(config.xSerie.accessor);
    const [xMin, xMax] = d3.extent(xVals);
    if (!(xMin instanceof Date && xMax instanceof Date)) return;
    const xScale = d3
      .scaleTime()
      .domain([xMin, xMax])
      .range([0, innerWidth])
      .nice();

    // Y scale (all series)
    const yVals = data.flatMap((d: ChartDataRow) =>
      series.map(({ accessor }: TimeVizSeriesConfig) => accessor(d))
    );

    const [yMin, yMax] = d3.extent(yVals);
    if (typeof yMin !== "number" || typeof yMax !== "number") return;
    const yScale = d3
      .scaleLinear()
      .domain([yMin, yMax])
      .range([innerHeight, 0])
      .nice();

    // Grid
    const xGrid = d3
      .axisBottom(xScale)
      .tickSize(-innerHeight)
      .tickFormat(() => "");
    const yGrid = d3
      .axisLeft(yScale)
      .tickSize(-innerWidth)
      .tickFormat(() => "");

    mainGroup
      .selectAll(".x.grid")
      .data([null])
      .join("g")
      .attr("class", "x grid")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(xGrid as any);

    mainGroup
      .selectAll(".y.grid")
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
      .tickFormat(d3.format(config.formatYAxis ?? ".2f") as any);

    mainGroup
      .selectAll("g.x.axis")
      .data([null])
      .join("g")
      .attr("class", "x axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis as any);

    mainGroup
      .selectAll("g.y.axis")
      .data([null])
      .join("g")
      .attr("class", "y axis")
      .call(yAxis as any);

    // Draw lines for each series (idempotent enter-update-exit pattern)
    const lineGenerators = series.map(({ accessor }) => {
      const line = d3
        .line<ChartDataRow>()
        .x((d) => xScale(config.xSerie.accessor(d)))
        .y((d) => yScale(accessor(d)));
      isCurved && line.curve(d3.curveCatmullRom);
      return line;
    });

    mainGroup
      .selectAll<SVGPathElement, TimeVizSeriesConfig>("path.serie")
      .data(series, ({ label }) => label)
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("class", "serie")
            .attr("data-label", ({ label }) => label)
            .attr("d", (_, i) => lineGenerators.at(i)?.(data) ?? "")
            .style("stroke", ({ color, label }) => color || colorScale(label)),
        (update) =>
          update
            .attr("d", (_, i) => lineGenerators.at(i)?.(data) ?? "")
            .style("stroke", ({ color, label }) => color || colorScale(label)),
        (exit) => exit.remove()
      );

    // // EXIT
    // serieSelection.exit().remove();

    // // UPDATE
    // serieSelection
    //   .attr("d", (_, i) => lineGenerators[i](data))
    //   .style("stroke", ({ color, label }) => color || colorScale(label));

    // // ENTER
    // serieSelection
    //   .enter()
    //   .append("path")
    //   .attr("class", "serie")
    //   .attr("d", (_, i) => lineGenerators[i](data))
    //   .style("stroke", ({ color, label }) => color || colorScale(label));

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
