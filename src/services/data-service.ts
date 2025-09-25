import type { ChartDataRow, TimeVizSeriesConfig } from "@/types";

/**
 * Creates a data service for managing chart data.
 * @returns An object containing data service methods.
 */
const createDataService = () => {
  /**
   * Filters the data based on a provided filter function.
   * @param series - All series in the chart.
   * @param selectedSeries - The currently selected series label or "All".
   * @param hiddenSeries - A set of labels for series that are hidden.
   * @returns Filtered array of series based on selection and visibility.
   */
  const selectedSeries = (
    series: TimeVizSeriesConfig[],
    selectedSeries: string,
    hiddenSeries: Set<string>
  ): TimeVizSeriesConfig[] => {
    if (selectedSeries === "All") {
      return series.filter(({ label }) => !hiddenSeries.has(label));
    }
    return series.filter(
      ({ label }) => label === selectedSeries && !hiddenSeries.has(label)
    );
  };

  /**
   * Filters rows by an x-axis accessor and a start/end date (inclusive),
   * then applies series selection/visibility rules.
   * Dates are parsed from yyyy-mm-dd strings and normalized to noon to
   * avoid timezone offset issues (same approach as in `time-viz.ts`).
   *
   * @param data - The chart data rows to filter.
   * @param xAccessor - Function to extract the x value (Date) from a row.
   * @param startDate - Start date string in ISO yyyy-mm-dd format.
   * @param endDate - End date string in ISO yyyy-mm-dd format.
   * @param selectedSeries - The currently selected series label or "All".
   * @param hiddenSeries - A set of labels for series that are hidden.
   * @returns Filtered array of ChartDataRow.
   */
  const filterBy = (
    data: ChartDataRow[],
    xAccessor: (d: ChartDataRow) => Date | number,
    startDate: string,
    endDate: string,
    selectedSeries: string,
    hiddenSeries: Set<string>
  ): ChartDataRow[] => {
    if (!data || !data.length) return [];

    // if either date is missing, skip range filtering
    let filteredByDate = data;
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      s.setHours(12, 0, 0, 0);
      e.setHours(12, 0, 0, 0);

      filteredByDate = data.filter((d) => {
        const date = xAccessor(d) as Date;
        if (!(date instanceof Date)) return false;
        return date >= s && date <= e;
      });
    }

    // apply series selection / hidden rules
    return selectedSeries === "All"
      ? filteredByDate.filter((row) => {
          const label = (row as any).label as string | undefined;
          return typeof label === "string" && !hiddenSeries.has(label);
        })
      : filteredByDate.filter((row) => {
          const label = (row as any).label as string | undefined;
          return label === selectedSeries && !hiddenSeries.has(label);
        });
  };

  /**
   * Validates the dataset for the chart.
   * @param data - The dataset to validate.
   * @returns True if the dataset is valid, false otherwise.
   */
  const validateDataSet = (data: ChartDataRow[]): boolean => {
    return Array.isArray(data) && data.length > 0;
  };

  /**
   * Gets the data domain (min/max values) for the specified accessors.
   * @param data - The dataset to analyze.
   * @param accessors - An array of accessor functions to extract values from the data.
   * @returns The data domain as a tuple [min, max] or null if invalid.
   */
  const getDataDomain = (
    data: ChartDataRow[],
    accessors: ((d: ChartDataRow) => number | Date)[]
  ): [number, number] | [Date, Date] | null => {
    if (!validateDataSet(data) || !accessors || accessors.length === 0) return null;

    // collect valid numeric and date values without using push
    const aggregated = accessors.reduce(
      (acc, accessor) => {
        const values = data.map(accessor);
        const numericFromAccessor = values.filter(
          (v): v is number => typeof v === "number" && !isNaN(v as number)
        );
        const dateTsFromAccessor = values
          .filter((v): v is Date => v instanceof Date && !isNaN((v as Date).getTime()))
          .map((d) => d.getTime());

        return {
          numeric: acc.numeric.concat(numericFromAccessor),
          dateTs: acc.dateTs.concat(dateTsFromAccessor),
        };
      },
      { numeric: [] as number[], dateTs: [] as number[] }
    );

    const numericValues = aggregated.numeric;
    const dateValues = aggregated.dateTs;

    const hasNumbers = numericValues.length > 0;
    const hasDates = dateValues.length > 0;
    if (!hasNumbers && !hasDates) return null;

    if (!hasNumbers && hasDates) {
      const minTs = Math.min(...dateValues);
      const maxTs = Math.max(...dateValues);
      return [new Date(minTs), new Date(maxTs)];
    }

    if (hasNumbers && !hasDates) {
      const minNum = Math.min(...numericValues);
      const maxNum = Math.max(...numericValues);
      return [minNum, maxNum];
    }

    const combined = numericValues.concat(dateValues);
    const minCombined = Math.min(...combined);
    const maxCombined = Math.max(...combined);
    return [minCombined, maxCombined];
  };

  return {
    selectedSeries,
    filterBy,
    validateDataSet,
    getDataDomain,
  };
};

export const DataService = createDataService();
