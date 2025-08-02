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

## Features

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

**Supported Versions:**

![Something](https://img.shields.io/badge/something->=1.5.5-blue)


## Features

1.
2.

## 🚀 Quick Installation

### 1. Create a ReScript Application

First, create a new ReScript application using one of the following commands:

```sh
npm create rescript-app@latest
```

> 📝**Note:** For more information on setting up a ReScript project, refer to the [official ReScript documentation](https://rescript-lang.org/docs/manual/latest/installation).

### 2. Install Dependencies

Add the required dependencies to your project:

```sh
npm i vanjs-core time-viz
```

### 3. Update Configuration `rescript.json` file

In your `rescript.json` file, add the following dependency:

```json
{
  "bs-dependencies": ["time-viz"]
}
```

## 🙌 Hello World Example

Here's a simple example of how to use `time-viz` to create a reactive UI component:

1. Create a file named `Main.res` in your `src` folder.
2. Add the following code to `Main.res`:

```rescript
@val @scope("document") @return(nullable)
external getElementById: string => option<Dom.element> = "getElementById"

let root = switch getElementById("root") {
| Some(el) => el
| None => Exn.raiseError("Root element not found")
}

let hello: unit => Dom.element = () => {
  Van.Tag.make("div")
  ->Van.Tags.addChild(Text("Hello, World!"))
  ->Van.Tags.build
}

Van.add(root, [Dom(hello())])->ignore
```

## 🛠 Build and Run

To build and run your ReScript application, see the [Compile and Run](https://metalbolicx.github.io/time-viz/#/compile-run) section.

## 📚 Documentation

<div align="center">

  [![view - Documentation](https://img.shields.io/badge/view-Documentation-blue?style=for-the-badge)](https://metalbolicx.github.io/time-viz/#/api-reference)

</div>

## ✍ Do you want to learn more?

1.
2.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Technologies used

<table>
  <tr>
    <td align="center">
      <a href="https://vanjs.org/" target="_blank">
        <img src="./images/vanjs-logo.png" alt="VanJS" width="42" height="42" /><br/>
        <b>VanJS</b><br/>
      </a>
    </td>
    <td align="center">
      <a href="https://rescript-lang.org/" target="_blank">
        <img src="./images/rescript-logo.png" alt="ReScript" width="42" height="42" /><br/>
        <b>ReScript</b><br/>
      </a>
    </td>
  </tr>
</table>

## License

Released under [MIT](/LICENSE) by [@MetalbolicX](https://github.com/MetalbolicX).