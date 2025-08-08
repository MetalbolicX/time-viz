import * as d3 from "d3";
import type { Selection, ScaleOrdinal } from "d3";
import type {
  TimeVizConfig,
  TimeVizSeriesConfig,
  ChartDataRow,
  MarginConfig,
} from "./types";

// import "tipviz";
import type { TipVizTooltip } from "tipviz";

/**
 * @module d3-time-viz
 * @description
 * This module provides a function to create a time visualization chart using D3.js.
 * It allows for multiple series, custom colors, and various configurations.
 */

/**
 * Creates a time visualization chart using D3.js.
 * The chart supports multiple series, custom colors, and various configurations.
 *
 * @returns {Function} A function that can be called with a D3 selection to render the chart.
 */
export const createTimeVizChart = () => {
  // let cachedTooltip: TipVizTooltip | null = null;
  let tooltip: TipVizTooltip;
  let config: TimeVizConfig;
  let series: TimeVizSeriesConfig[];
  let data: ChartDataRow[];
  let colorScale: d3.ScaleOrdinal<string, string>;
  let isCurved: boolean;
  let isStatic: boolean;
  let transitionTime: number = 0;
  let xTicks: number = 5;
  let yTicks: number = 5;
  let margin: MarginConfig = {
    top: 30,
    right: 40,
    bottom: 30,
    left: 40,
  };
  let formatXAxis: string = "%Y-%m-%d";
  let formatYAxis: string = ".2f";
  let xSerie: (d: ChartDataRow) => Date | number;
  let innerWidth: number = 0;
  let innerHeight: number = 0;
  let xScale: d3.ScaleTime<number, number>;
  let yScale: d3.ScaleLinear<number, number>;
  let yAxisLabel: string = "";
  let xAxisLabel: string = "";

  /**
   * Utility function to get the size of the SVG element.
   * @description
   * It retrieves the width and height of the SVG element from its bounding client rectangle.
   * @param {Selection<SVGElement, unknown, null, undefined>} selection - The D3 selection of the SVG element.
   * @returns {Object} An object containing the width and height of the SVG element.
   */
  const getSize = (
    selection: Selection<SVGElement, unknown, null, undefined>
  ) => {
    const { width = 0, height = 0 } =
      selection.node()?.getBoundingClientRect() || {};
    return { width, height };
  };

  /**
   * Renders the X axis of the chart.
   * @description
   * The X axis is scaled based on the xSerie accessor and formatted according to `formatXAxis`.
   * It uses the X scale to determine the positions of the ticks.
   * @param {Selection<SVGElement, unknown, null, undefined>} selection - The D3 selection of the SVG element.
   * @returns {void}
   */
  const renderXAxis = (
    selection: Selection<SVGElement, unknown, null, undefined>
  ): void => {
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(xTicks)
      .tickFormat(d3.timeFormat(formatXAxis) as any);

    selection
      .selectAll("g.x.axis")
      .data([null])
      .join("g")
      .attr("class", "x axis")
      .attr("transform", `translate(0, ${innerHeight + margin.top})`)
      .call(xAxis as any);
  };

  /**
   * Renders the Y axis of the chart.
   * @description
   * The Y axis is scaled based on the data and series provided.
   * It uses a linear scale and formats the ticks according to `formatYAxis`.
   * @param {Selection<SVGElement, unknown, null, undefined>} selection - The D3 selection of the SVG element.
   * @returns {void}
   */
  const renderYAxis = (
    selection: Selection<SVGElement, unknown, null, undefined>
  ): void => {
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(yTicks)
      .tickFormat(d3.format(formatYAxis));

    selection
      .selectAll("g.y.axis")
      .data([null])
      .join("g")
      .attr("class", "y axis")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(yAxis as any);
  };

  /**
   * Renders the X grid lines on the chart.
   * @description
   * The grid lines are drawn at each tick of the X scale.
   * It uses the X scale to determine the positions of the grid lines.
   * @param {Selection<SVGElement, unknown, null, undefined>} selection - The D3 selection of the SVG element.
   * @returns {void}
   */
  const renderXGrid = (
    selection: Selection<SVGElement, unknown, null, undefined>
  ): void => {
    const [yMin, yMax] = yScale.domain();
    selection
      .selectAll(".grids")
      .data([null])
      .join("g")
      .attr("class", "grids")
      .selectAll(".x.grid")
      .data(xScale.ticks(xTicks))
      .join("line")
      .attr("class", "x grid")
      .attr("x1", (d) => xScale(d))
      .attr("y1", yScale(yMin))
      .attr("x2", (d) => xScale(d))
      .attr("y2", yScale(yMax));
  };

  /**
   * Renders the Y grid lines on the chart.
   * @description
   * The grid lines are drawn at each tick of the Y scale.
   * It uses the Y scale to determine the positions of the grid lines.
   * @param {Selection<SVGElement, unknown, null, undefined>} selection - The D3 selection of the SVG element.
   * @returns {void}
   */
  const renderYGrid = (
    selection: Selection<SVGElement, unknown, null, undefined>
  ): void => {
    const [xMin, xMax] = xScale.domain();
    selection
      .selectAll(".grids")
      .data([null])
      .join("g")
      .attr("class", "grids")
      .selectAll(".y.grid")
      .data(yScale.ticks(yTicks))
      .join("line")
      .attr("class", "y grid")
      .attr("x1", xScale(xMin))
      .attr("y1", (d) => yScale(d))
      .attr("x2", xScale(xMax))
      .attr("y2", (d) => yScale(d));
  };

  /**
   * Renders the series lines on the chart.
   * @description
   * Each series is represented by a path element.
   * The lines can be curved based on the `isCurved` flag.
   * @param {Selection<SVGElement, unknown, null, undefined>} selection - The D3 selection of the SVG element.
   * @returns {void}
   */
  const renderSeries = (
    selection: Selection<SVGElement, unknown, null, undefined>
  ): void => {
    if (!config || !series?.length || !data?.length) return;

    const lineGenerators = series.map(({ accessor }) => {
      const line = d3
        .line<ChartDataRow>()
        .x((d) => xScale(xSerie(d)))
        .y((d) => yScale(accessor(d)));
      isCurved && line.curve(d3.curveCatmullRom);
      return line;
    });

    selection
      .selectAll(".series")
      .data([null])
      .join("g")
      .attr("class", "series")
      .selectAll<SVGPathElement, TimeVizSeriesConfig>("path.serie")
      .data(series, ({ label }) => label)
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("class", "serie")
            .attr("data-label", ({ label }) => label)
            .attr("d", (_, i) => lineGenerators.at(i)?.(data) ?? "")
            .style("stroke", ({ color, label }) => color || colorScale(label))
            .call((serie) => {
              const node = serie.node();
              if (!node) return;
              const totalLength = node.getTotalLength();
              serie
                .attr("stroke-dasharray", totalLength)
                .attr("stroke-dashoffset", totalLength)
                .transition()
                .duration(transitionTime)
                .attr("stroke-dashoffset", 0);
            }),
        (update) =>
          update
            .transition()
            .duration(transitionTime)
            .style("stroke", ({ color, label }) => color || colorScale(label))
            .attr("d", (_, i) => lineGenerators.at(i)?.(data) ?? ""),
        (exit) => exit.remove()
      );
  };

  /**
   * Renders the cursor on the chart.
   * @description
   * The cursor is a vertical line and points that follow the mouse position.
   * It highlights the closest data point to the mouse position.
   * @param {Selection<SVGElement, unknown, null, undefined>} selection - The D3 selection of the SVG element.
   * @param {ChartDataRow} closestRow - The closest data row to the mouse position.
   * @returns {void}
   */
  const renderCursor = (
    selection: Selection<SVGElement, unknown, null, undefined>,
    closestRow: ChartDataRow
  ): void => {
    if (isStatic) return;
    const cursorGroup = selection
      .selectAll("g.cursor")
      .data([null])
      .join("g")
      .attr("class", "cursor");

    cursorGroup
      .selectAll(".cursor-point")
      .data(
        series.map(({ accessor, label, color }) => ({
          label,
          color,
          x: xSerie(closestRow),
          y: accessor(closestRow),
        }))
      )
      .join("circle")
      .attr("class", "cursor-point")
      .attr("cx", ({ x }) => xScale(x))
      .attr("cy", ({ y }) => yScale(y))
      .attr("r", 4)
      .style("stroke", ({ color, label }) => color || colorScale(label));

    cursorGroup
      .selectAll(".cursor-line")
      .data([closestRow])
      .join("line")
      .attr("class", "cursor-line")
      .attr("x1", xScale(xSerie(closestRow)))
      .attr("y1", margin.top)
      .attr("x2", xScale(xSerie(closestRow)))
      .attr("y2", innerHeight + margin.top);
  };

  /**
   * Renders the Y axis label on the chart.
   * @description
   * The Y axis label is positioned at the left side of the chart.
   * It is rotated to be vertical and positioned according to the margin.
   * @param {Selection<SVGElement, unknown, null, undefined>} selection - The D3 selection of the SVG element.
   * @returns {void}
   */
  const renderYAxisLabel = (
    selection: Selection<SVGElement, unknown, null, undefined>
  ): void => {
    if (!yAxisLabel) return;
    selection
      .selectAll(".labels")
      .data([null])
      .join("g")
      .attr("class", "labels")
      .selectAll(".y.axis-label")
      .data([yAxisLabel])
      .join("text")
      .attr("class", "y axis-label")
      .attr("x", -margin.left)
      .attr("y", margin.top)
      .attr("transform", `rotate(-90, ${margin.left}, ${margin.top})`)
      .attr("dy", "1em")
      .text((d) => d);
  };

  /**
   * Renders the X axis label on the chart.
   * @description
   * The X axis label is positioned at the bottom of the chart.
   * It is centered horizontally and positioned according to the margin.
   * @param {Selection<SVGElement, unknown, null, undefined>} selection - The D3 selection of the SVG element.
   * @returns {void}
   */
  const renderXAxisLabel = (
    selection: Selection<SVGElement, unknown, null, undefined>
  ): void => {
    if (!xAxisLabel) return;
    selection
      .selectAll(".labels")
      .data([null])
      .join("g")
      .attr("class", "labels")
      .selectAll(".x.axis-label")
      .data([xAxisLabel])
      .join("text")
      .attr("class", "x axis-label")
      .attr("x", innerWidth / 2 + margin.left)
      .attr("y", innerHeight + margin.top)
      .attr("dy", "-0.5em")
      .text((d) => d);
  };

  const renderLegend = (
    selection: Selection<SVGElement, unknown, null, undefined>
  ): void => {
    if (!config || !series?.length) return;

    const legendGroup = selection
      .selectAll("g.legend")
      .data([null])
      .join("g")
      .attr("class", "legend")
      .attr("transform", `translate(${innerWidth}, ${margin.top})`);

    legendGroup
      .selectAll(".legend-item")
      .data(series)
      .join("g")
      .attr("class", "legend-item")
      .attr("data-label", ({ label }) => label)
      .attr("transform", (_, i) => `translate(0, ${20 * i})`)
      .call((group) => {
        group
          .selectAll("rect")
          .data((d) => [d])
          .join("rect")
          .attr("class", "legend-square")
          .style("fill", ({ color, label }) => color || colorScale(label));

        group
          .selectAll("text")
          .data((d) => [d])
          .join("text")
          .attr("class", "legend-label")
          .attr("x", 20)
          .attr("y", 14)
          .text(({ label }) => label);
      });
  };

  // const createTooltip = (): TipVizTooltip => {
  //   if (!cachedTooltip) {
  //     const tooltip = document.createElement(
  //       "tip-viz-tooltip"
  //     ) as TipVizTooltip;
  //     tooltip.setAttribute("transition-time", "200");
  //     tooltip.classList.add("d3-time-viz-tooltip");
  //     document.body.appendChild(tooltip);
  //     cachedTooltip = tooltip;
  //   }
  //   return cachedTooltip;
  // };

  // const removeTooltip = (): void => {
  //   if (cachedTooltip && cachedTooltip.parentNode) {
  //     cachedTooltip.parentNode.removeChild(cachedTooltip);
  //     cachedTooltip = null;
  //   }
  // };

  /**
   * The main chart function that renders the time visualization.
   * @description
   * It sets up the SVG element, scales, axes, grids, series, and cursor.
   * @param {Selection<SVGElement, unknown, null, undefined>} selection - The D3 selection of the SVG element.
   * @returns {void}
   * @example
   * ```ts
   * const svg = d3.select("svg");
   * const chart = createTimeVizChart();
   * chart(svg);
   * ```
   */
  const chart = (
    selection: Selection<SVGElement, unknown, null, undefined>
  ) => {
    if (!config || !series?.length || !data?.length) return;

    const { width, height } = getSize(selection);
    if (!(width && height)) return;
    selection.attr("viewBox", `0 0 ${width} ${height}`);
    innerWidth = width - (margin.left + margin.right);
    innerHeight = height - (margin.top + margin.bottom);
    if (innerWidth <= 0 && innerHeight <= 0) return;

    const xVals = data.map(xSerie);
    const [xMin, xMax] = d3.extent(xVals);
    if (!(xMin instanceof Date && xMax instanceof Date)) return;
    xScale = d3
      .scaleTime()
      .domain([xMin, xMax])
      .range([margin.left, innerWidth + margin.left])
      .nice();

    // Y scale (all series)
    const yVals = data.flatMap((d: ChartDataRow) =>
      series.map(({ accessor }: TimeVizSeriesConfig) => accessor(d))
    );

    const [yMin, yMax] = d3.extent(yVals);
    if (!(typeof yMin === "number" && typeof yMax === "number")) return;
    yScale = d3
      .scaleLinear()
      .domain([yMin, yMax])
      .range([innerHeight + margin.top, margin.top])
      .nice();

    selection
      .call(renderXAxis)
      .call(renderXGrid)
      .call(renderXAxisLabel)
      .call(renderYAxis)
      .call(renderYGrid)
      .call(renderYAxisLabel)
      .call(renderSeries)
      .call(renderLegend);

    // Cursor interaction (only if not static)
    if (isStatic) return;
    selection
      .on("pointermove", (event) => {
        const [mouseX, mouseY] = d3.pointer(event);
        const [xMinRange, xMaxRange] = xScale.range();
        const [yMaxRange, yMinRange] = yScale.range();
        // Check if mouse is within the chart area
        const isWithinXAxis = mouseX >= xMinRange && mouseX <= xMaxRange;
        const isWithinYAxis = mouseY >= yMinRange && mouseY <= yMaxRange;
        if (!(isWithinXAxis && isWithinYAxis)) {
          selection.select(".cursor").remove();
          return;
        }
        // Only create the tooltip once, when needed
        if (!data.length) return;
        // Use d3.bisector for O(log n) lookup
        const xValues = data.map(xSerie);
        const mouseDate = xScale.invert(mouseX);
        const bisect = d3.bisector((d: Date | number) => d).center;
        const idx = bisect(xValues, mouseDate);
        // Clamp index to valid range
        const clampedIdx = Math.max(0, Math.min(idx, data.length - 1));
        const closestDatum = data.at(clampedIdx);

        if (closestDatum) selection.call(renderCursor, closestDatum);
      })
      .on("pointerover", ({ target }) => {
        if (target.classList.contains("cursor-point")) {
          const datum = d3.select(target).datum();
          tooltip.show(datum as ChartDataRow, target);
        }
      })
      .on("pointerout", ({ target }) => {
        if (target.classList.contains("cursor-point")) {
          tooltip.hide();
        }
      });
  };

  chart.xSerie = (accessor: (d: ChartDataRow) => Date | number) => (
    (xSerie = accessor), chart
  );
  chart.config = (configuration: TimeVizConfig) => (
    (config = configuration), chart
  );
  chart.series = (fields: TimeVizSeriesConfig[]) => ((series = fields), chart);
  chart.data = (dataset: ChartDataRow[]) => ((data = dataset), chart);
  chart.colorScale = (color: ScaleOrdinal<string, string>) => (
    (colorScale = color), chart
  );
  chart.isCurved = (bool: boolean) => ((isCurved = bool), chart);
  chart.isStatic = (bool: boolean) => ((isStatic = bool), chart);
  chart.transitionTime = (time: number) => ((transitionTime = time), chart);
  chart.xTicks = (quantity: number) => ((xTicks = quantity), chart);
  chart.yTicks = (quantity: number) => ((yTicks = quantity), chart);
  chart.margin = (marg: MarginConfig) => (
    (margin = { ...margin, ...marg }), chart
  );
  chart.formatXAxis = (format: string) => ((formatXAxis = format), chart);
  chart.formatYAxis = (format: string) => ((formatYAxis = format), chart);
  chart.yAxisLabel = (label: string) => ((yAxisLabel = label), chart);
  chart.xAxisLabel = (label: string) => ((xAxisLabel = label), chart);
  chart.tooltip = (tooltipInstance: TipVizTooltip) => (
    (tooltip = tooltipInstance), chart
  );

  return chart;
};
