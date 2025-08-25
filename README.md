# Time Viz Component

A web component for visualizing time series data built with Lit and D3.js.

**Supported Versions:**

![D3.js](https://img.shields.io/badge/D3.js->=7.9.0-blue)
![Lit](https://img.shields.io/badge/Lit->=3.3.1-blue)

## Features

- ✨ Responsive SVG-based charts using `viewBox` and `preserveAspectRatio`.
- 📊 Multiple time series support with color-coded lines.
- 🎯 Interactive cursor tracking (optional).
- 🔍 Series filtering via dropdown list to see one at a time.
- 📈 Curved or straight line rendering.
- 🎨 Customizable axes, grid, and formatting via attributes.
- 🔍 Filter the chart between different time ranges.

## Usage

### Installation from npm

```bash
npm install time-viz
```

### Installation via CDN

```html
<script src="https://unpkg.com/d3@7"></script>
<script type="module" src="https://unpkg.com/time-viz"></script>
```

### Basic Usage

```html
<time-viz
  is-curved="true"
  x-ticks="6"
  y-ticks="8"
>
  <h3 slot="chart-title">Time Series Example</h3>
</time-viz>
```

### Setting Data

```javascript
const data = [
  { date: new Date("2023-01-01"), revenue: 100 },
  { date: new Date("2023-01-02"), revenue: 120 },
  { date: new Date("2023-01-03"), revenue: 80 },
  { date: new Date("2023-01-04"), revenue: 95 },
];

const chart = document.querySelector("time-viz");
chart.config = {
  data,
  xSerie: {
    accessor: (d) => d.date,
    label: "Date",
  },
  ySeries: [{
    accessor: (d) => d.revenue,
    label: "Revenue",
  }],
};
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `is-static` | boolean | `true` | Disable interactivity (cursor tracking, legend clicks) |
| `transition-time` | number | `0` | Transition duration in milliseconds |
| `is-curved` | boolean | `false` | Use curved lines instead of straight lines |
| `margin` | object | `{top: 40, right: 80, bottom: 60, left: 60}` | Chart margins following [D3 convention](https://observablehq.com/@d3/margin-convention) |
| `x-ticks` | number | `5` | Number of ticks on X-axis |
| `y-ticks` | number | `5` | Number of ticks on Y-axis |
| `format-x-axis` | string | `"%Y-%m-%d"` | D3 time format string for X-axis |
| `format-y-axis` | string | `".2f"` | D3 number format string for Y-axis |

## Data Format

The `data` property accepts an array of objects with the following structure:

```typescript
interface TimeSeriesDataPoint {
  date: Date;           // The time point
  value: number;        // The numeric value
  series?: string;      // Optional series name (defaults to "default")
}
```

## Component Features

### Multiple Series

Different series are automatically color-coded using D3's category color scheme. Series can be filtered using the dropdown control.

### Interactive Mode

When `is-static="false"`:

- Cursor line follows mouse movement
- Points highlight at cursor position
- Legend items can be clicked to hide/show series

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Technologies used

<table>
  <tr>
    <td align="center">
      <a href="https://d3js.org/" target="_blank">
        <img src="https://raw.githubusercontent.com/d3/d3-logo/refs/heads/master/d3.svg" alt="D3.js" width="42" height="42" /><br/>
        <b>D3.js</b><br/>
      </a>
    </td>
    <td align="center">
      <a href="https://lit.dev/" target="_blank">
        <img src="https://cdn.worldvectorlogo.com/logos/lit-1.svg" alt="Lit" width="42" height="42" /><br/>
        <b>Lit</b><br/>
      </a>
    </td>
  </tr>
</table>

## License

Released under [MIT](/LICENSE) by [@MetalbolicX](https://github.com/MetalbolicX).
