---
applyTo: "**"
description: General guidelines and best practices for writing code.
---
# General Guidelines for Writing Code

<general_guidelines>

- Do not make assumptions or speculate without clear evidence. Verify or clarify requirements before proceeding.
- Make changes file by file.
- Never use apologies or give feedback about understanding in comments or documentation.
- Do not suggest whitespace changes or summarize the changes made.
- Prioritize code performance and security in suggestions.
- Analyze potential error scenarios and implement robust error handling and user-friendly messages.
- Encourage modular design for maintainability and reusability.
- Replace hardcoded values with named constants.

<example>
```ts
const TAX_RATE = 0.2;

function calculateTotal(price: number): number {
  return price + price * TAX_RATE;
}
```
</example>

</general_guidelines>

<clean_code>
<naming_conventions>

- For boolean data types, use names that simulate a question such as `hasOne`, `isAtLeastOne`, `isValid`, `isEmpty`, etc.
- Use meaningful names that describe the purpose of the variable, function, or class.

<example>
```ts
// Bad naming
const x = true; // Not descriptive
const a = 5; // Not descriptive
const fruits = ["apple", "banana"]; // Not descriptive


  // Good naming
const isUserLoggedIn = true;
const maxRetryAttempts = 5;
function fetchUserData(userId: string): UserData {
  // Fetch user data logic
}
const fruitNames = ["apple", "banana"]; // More descriptive
const userProfile = {
  name: "John Doe",
  age: 30,
  isActive: true
};
const fruits = [
  { name: "apple", color: "red" },
  { name: "banana", color: "yellow" }
]; // Context provides more data
```
</example>

- For functions, use names that simulate an action such as `validateUser`, etc.
- Avoid using acronyms in names unless they are widely recognized (e.g., `HTML`, `URL`, `API`) or they are part of a convention by a given context.

<example>
```js
// In d3.js a callback uses d, i, ns to refer to data, index, and elements in an array respectively.
d3.select("body")
  .selectAll("p")
  .data(data)
  .enter()
  .append("p")
  .text((d, i, ns) => `Data: ${d}, Index: ${i}, Node: ${ns}`);

// In display context bg or fg are used for background and foreground
const display = {
  bgColor: "white",
  fgColor: "black",
};
```
</example>

</naming_conventions>

- Avoid the use of nested `if` statements and take advantage of early return.

<example>
```ts
// Recommended
function processData(data: DataType): ResultType {
  if (!data) {
    return null; // Early return for invalid data
  }

  // Process data here
  return result;
}
```
</example>

</clean_code>

# Project Overview

The `time-viz` project is a web component designed to visualize time series data (line charts). It will be built in:

- TypeScript.
- D3.js version 7.
- Web Components standards.
- Lit library version 3.

## Requirements

- Render multiple series.
- The domain for time will be the x values.
- The only x axis will be at bottom and y axis at left.
- Render the labels for the x and y axis and the legend for multiple series.
- Render the  grid of x and y.
- Render the chart title.
- Use the cursor to follow the mouse movement and render the line and point for interaction.
- Drop down list to filter the data by series.
- Use the `d3.scaleTime` for the x axis and `d3.scaleLinear` for the y axis.
- Be responsive using the svg `viewBox` attribute and `preserveAspectRatio`.
- Data should be passed as an array of objects using a setter, not by attribute.
- Apply semantic HTML.
- Use data visualization best practices in CSS and styles.
- Add a button to download the chart in SVG format.
