# Time Viz Component

A web component for visualizing time series data built with Lit 3 and D3.js v7.

## Features

- ✨ Responsive SVG-based charts using `viewBox` and `preserveAspectRatio`
- 📊 Multiple time series support with color-coded lines
- 🎯 Interactive cursor tracking (optional)
- 🔍 Series filtering via dropdown
- 📈 Curved or straight line rendering
- 🎨 Customizable axes, grid, and formatting
- 📄 SVG export functionality
- ♿ Semantic HTML and accessibility features

## Usage

### Installation

```bash
npm install time-viz
```

### Basic Usage

```html
<time-viz
  chart-title="My Time Series"
  is-static="false"
  is-curved="true"
  x-ticks="6"
  y-ticks="8"
></time-viz>
```

### Setting Data

```javascript
const chart = document.querySelector('time-viz');
chart.data = [
  { date: new Date('2023-01-01'), value: 100, series: 'Sales' },
  { date: new Date('2023-01-02'), value: 120, series: 'Sales' },
  { date: new Date('2023-01-01'), value: 80, series: 'Revenue' },
  { date: new Date('2023-01-02'), value: 95, series: 'Revenue' },
];
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `is-static` | boolean | `true` | Disable interactivity (cursor tracking, legend clicks) |
| `transition-time` | number | `0` | Transition duration in milliseconds |
| `is-curved` | boolean | `false` | Use curved lines instead of straight lines |
| `margin` | object | `{top: 40, right: 80, bottom: 60, left: 60}` | Chart margins following D3 convention |
| `x-ticks` | number | `5` | Number of ticks on X-axis |
| `y-ticks` | number | `5` | Number of ticks on Y-axis |
| `format-x-axis` | string | `"%Y-%m-%d"` | D3 time format string for X-axis |
| `format-y-axis` | string | `".2f"` | D3 number format string for Y-axis |
| `chart-title` | string | `""` | Chart title displayed above the chart |

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

### Responsive Design

The component uses SVG with `viewBox` for automatic scaling and maintains aspect ratio across different container sizes.

### Accessibility

- Semantic HTML structure with `<figure>` and proper ARIA labels
- Keyboard accessible controls
- Screen reader friendly

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

## License

MIT
