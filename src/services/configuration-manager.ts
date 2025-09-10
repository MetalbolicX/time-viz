import type { ChartConfig, MarginConfig } from "@/types";

const DEFAULT_TRANSITION_TIME = 0;
const DEFAULT_X_TICKS = 5;
const DEFAULT_Y_TICKS = 5;
const DEFAULT_MARGIN: MarginConfig = { top: 30, right: 40, bottom: 30, left: 40 };
const DEFAULT_FORMAT_X_AXIS = "%Y-%m-%d";
const DEFAULT_FORMAT_Y_AXIS = ".2f";
const DEFAULT_Y_AXIS_LABEL = "";
const DEFAULT_X_AXIS_LABEL = "";
const DEFAULT_IS_CURVED = false;
const DEFAULT_IS_STATIC = false;

const DEFAULT_CONFIG: ChartConfig = {
  transitionTime: DEFAULT_TRANSITION_TIME,
  xTicks: DEFAULT_X_TICKS,
  yTicks: DEFAULT_Y_TICKS,
  margin: DEFAULT_MARGIN,
  formatXAxis: DEFAULT_FORMAT_X_AXIS,
  formatYAxis: DEFAULT_FORMAT_Y_AXIS,
  yAxisLabel: DEFAULT_Y_AXIS_LABEL,
  xAxisLabel: DEFAULT_X_AXIS_LABEL,
  isCurved: DEFAULT_IS_CURVED,
  isStatic: DEFAULT_IS_STATIC,
};

/**
 * ConfigurationManager provides methods to manage and validate chart configurations.
 */
export const ConfigurationManager = (() => {
  /**
   * Gets the default chart configuration.
   * @returns {ChartConfig} A copy of the default chart configuration.
   */
  const getDefaultConfig = (): ChartConfig => {
    return { ...DEFAULT_CONFIG };
  };

  /**
   * Validates the given chart configuration.
   * @param config - The chart configuration to validate.
   * @returns An array of validation error messages.
   */
  const validateConfig = (config: Partial<ChartConfig>): string[] => {
    let errors: string[] = [];
    if (config.transitionTime !== undefined && (typeof config.transitionTime !== "number" || config.transitionTime < 0)) {
      errors = [...errors, "transitionTime must be a non-negative number"];
    }
    if (config.xTicks !== undefined && (typeof config.xTicks !== "number" || config.xTicks < 0)) {
      errors = [...errors, "xTicks must be a non-negative number"];
    }
    if (config.yTicks !== undefined && (typeof config.yTicks !== "number" || config.yTicks < 0)) {
      errors = [...errors, "yTicks must be a non-negative number"];
    }
    if (config.isCurved !== undefined && typeof config.isCurved !== "boolean") {
      errors = [...errors, "isCurved must be a boolean"];
    }
    if (config.isStatic !== undefined && typeof config.isStatic !== "boolean") {
      errors = [...errors, "isStatic must be a boolean"];
    }
    return errors;
  };

  /**
   * Merges the base chart configuration with overrides.
   * @param base - The base chart configuration.
   * @param override - The chart configuration overrides.
   * @returns The merged chart configuration.
   */
  const mergeConfigs = (base: ChartConfig, override: Partial<ChartConfig>): ChartConfig => {
    const validationErrors = validateConfig(override);
    if (validationErrors.length > 0) {
      console.warn("Configuration validation errors:", validationErrors);
    }
    return {
      ...base,
      ...override,
      margin: override.margin ? { ...base.margin, ...override.margin } : base.margin,
    };
  };

  /**
   * Creates a chart configuration from the attributes of an HTML element.
   * @param element - The HTML element from which to create the chart configuration.
   * @returns A partial chart configuration object.
   */
  const createFromAttributes = (element: HTMLElement): Partial<ChartConfig> => {
    const config: Partial<ChartConfig> = {};

    const isStatic = element.getAttribute("is-static");
    if (isStatic !== null) config.isStatic = true;

    const transitionTime = element.getAttribute("transition-time");
    if (transitionTime) config.transitionTime = Number(transitionTime);

    const isCurved = element.getAttribute("is-curved");
    if (isCurved !== null) config.isCurved = true;

    const xTicks = element.getAttribute("x-ticks");
    if (xTicks) config.xTicks = Number(xTicks);

    const yTicks = element.getAttribute("y-ticks");
    if (yTicks) config.yTicks = Number(yTicks);

    const formatXAxis = element.getAttribute("format-x-axis");
    if (formatXAxis) config.formatXAxis = formatXAxis;

    const formatYAxis = element.getAttribute("format-y-axis");
    if (formatYAxis) config.formatYAxis = formatYAxis;

    const yAxisLabel = element.getAttribute("y-axis-label");
    if (yAxisLabel) config.yAxisLabel = yAxisLabel;

    const xAxisLabel = element.getAttribute("x-axis-label");
    if (xAxisLabel) config.xAxisLabel = xAxisLabel;

    const margin = element.getAttribute("margin");
    if (margin) {
      try {
        config.margin = JSON.parse(margin);
      } catch (e) {
        console.error("Failed to parse margin attribute:", e);
      }
    }

    return config;
  };

  return {
    getDefaultConfig,
    validateConfig,
    mergeConfigs,
    createFromAttributes,
  };
})();
