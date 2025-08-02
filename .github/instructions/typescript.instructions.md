---
applyTo: "**/*.ts, **/*.tsx, **/*.js, **/*.jsx, **/*.mjs, **/*.cjs,"
description: This document provides guidelines and best practices for writing TypeScript and JavaScript code. It is intended to ensure consistency, readability, and maintainability across the codebase.
---
# Instructions to write TypeScript/JavaScript code

<general_guidelines>

- Use `ES2025` or greater version of modern JavaSript.
- Use `ES6` modules over CommonJS for imports and exports.
- In JavaScript files, use the `strict` directive. In additions, always use JsDoc when a variable is declared, and in functions and methods of the classes.
- Always use `===` and `!==` over `==` and `!=`.
- In TypeScript files, never add the types annotation for primitive types.
- Use `async` and `await` for asynchronous operations rather than `Promise` or callbacks.

<example>
```js
"use strict";

/**
 * Adds two numbers.
 * @param {number} a - The first number.
 * @param {number} b - The second number.
 * @returns {number} The sum of the two numbers.
 */
const add = (a, b) =>  a + b;

const x /** @type {number} */ = 5;
const y /** @type {number} */ = 10;
const sum = add(x, y);
console.log(`The sum is: ${sum}`);
```
</example>

<naming_conventions>
  - Use `camelCase` for variable and function names, and `PascalCase` for class names.
  - Use `UPPER_SNAKE_CASE` for constants.
</naming_conventions>

</general_guidelines>


<code_style>

<general_formatting>
  - Always use double quotes for the strings and use semicolon at the end.
  - To concatenate a string, always use template literals. And never use the `+` operator. In addition, use template literals for multi-line strings.
</general_formatting>

<codding_paradigms>
  - Use TypeScript features like interfaces, types, and enums to define data structures and types.
  - Use functional programming concepts such as pure functions, immutability, and higher-order functions.
  - Avoid side effects in functions and methods.
  - Use the `pipe` function to compose functions together.
  <example>
  ```ts
  const salute = (name?: string = "John Doe"): string => `Hello, ${name}!`;
  const toUpperCase = (str: string): string => str.toUpperCase();

  const pipe = (...fns: Function[]) => (value: any) =>
    fns.reduce((acc, fn) => fn(acc), value);

  const result = pipe(salute, toUpperCase)("Alice");
  console.log(result); // "HELLO, ALICE!"
  ```
  </example>
</codding_paradigms>

<variable_declaration>
  - By default use `const`, unless you need to reassign the variable, in which case use `let`. Never use `var` keyword.
  - Use the `using` keyword for resource management to ensure proper cleanup of resources.
  - Use `Symbol.asyncDispose` to define an asynchronous cleanup method for resources.
  <example>
  ```js
  const getConnection = async () => {
    const connection = await getDatabaseConnection();
    return {
      connection,
      [Symbol.asyncDispose]: async () => await connection.close()
    };
  };

  {
    await using db = getConnection();
    // Use db.connection for queries
  }
  // Connection is automatically closed here
  ```
  </example>
  <example>
  ```js
  import { open } from "node:fs/promises";

  const getFileHandle = async (path) => {
    const fileHandle = await open(path, "r");
    return {
      fileHandle,
      [Symbol.asyncDispose]: async () => await fileHandle.close()
    };
  };

  {
    await using file = getFileHandle("example.txt");
    // Operate on file.fileHandle
  }
  // File is automatically closed after this block
  ```
  </example>
</variable_declaration>
<conditionals>
  - Take advantage of the truthy and falsy values.
  - Use for simple conditions the ternary operator instead of `if` statements. Use if for three levels of conditions and for more than four levels of conditions use `switch` statements.
</conditionals>
<loops>
  - Have preference for `for of` loop to iterate over arrays and `for in` loop to iterate over objects.
  - Never use of `for` loop to fill arrays and use the array method methods.
  - To iterate for asynchronous operations, use `for await of` loop.
</loops>

<arrays>
  - To increase an array use the spread operator and not the `push` method.
  - Use `Array.from` to create arrays from iterable objects and `Array.fromAsync` for asynchronous operations.
  - Use the array methods like `map`, `filter`, `reduce`, `find`, `some`, `every`, etc. to manipulate arrays. Do not use `for` loops to manipulate arrays.
  - Use destructuring to extract values from arrays. Verify whether a default value is needed.
  - Do not get the value of an array by index, instead use the `at` method. Especially use the `at` method to get last value of an array.
  - Use the `Array.prototype.flat` or `Array.prototype.flatMap` method to flatten arrays.
  - Use `Array.prototype.fromAsync` to create arrays from asynchronous iterables.
  - When performance is a concern, use the global iterator methods (ES2025) that turn into an iterable data structures like the array to process them.
  <example>
  ```ts
  // Do not use see <loop> sections
  const numbers = [];
  for (let i = 0; i < 10; i++) {
    numbers.push(i);
  }

  // Recommended
  const numbers = Array.from({ length: 10 }, (_, i) => i);

  const moreNumbers = [10, 11, 12];
  const allNumbers = [...numbers, ...moreNumbers];

  async function* generateNumbers(): AsyncGenerator<number> {
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async operation
      yield i;
    }
  }

  const createArray = async (): Promise<void> => {
    const numbersArray = await Array.fromAsync(generateNumbers());
    console.log(numbersArray); // Output: [0, 1, 2]
  };

  createArray();

  const numbers = [1, 2, 3, 4, 5];
  const doubled = numbers.map(num => num * 2); // Using map to double each number
  const evenNumbers = numbers.filter(num => num % 2 === 0); // Using filter to get even numbers
  const lastEvenNumber = evenNumbers.at(-1); // Using at to get the last even number

  const iterator = Iteraror.from(numbers);
  const result = iterator.map(num => num * 2).filter(num => num % 2 === 0).take(2).toArray();

  const [first = 0, second, ...rest] = numbers; // Destructuring an array
  ```
  </example>

</arrays>
<object_literals>
  - Use the spread operator to copy or merge objects and update or extend existing properties.
  - Use destructuring to extract values from objects. Verify whether a default value is needed.
  - Use `Object.fromEntries` to convert an array of key-value pairs into an object.
  - Use `Object.entries`, `Object.keys`, and `Object.values` to iterate over objects.
  <example>
  ```ts
  const person = {
    name: "Alice",
    age: 30,
    greet() {
      console.log(`Hello, my name is ${this.name}`);
    }
  };

  const newPerson = { ...person, age: 31, city: "Wonderland" }; // Merging objects

  const { name, age } = person; // Destructuring an object
  console.log(name, age); // Output: Alice 30

  const coordinates = { x: 10, y: 20 };
  const { x = 0, y = 0 } = coordinates; // Destructuring with default values
  console.log(x, y); // Output: 10 20

  const updatedPerson = { ...person, age: 31 }; // Updating properties

  const entries = Object.entries(person);
  for (const [key, value] of entries) {
    console.log(`${key}: ${value}`);
  }

  const keyValuePairs = [["name", "Alice"], ["age", 30]];
  const objFromEntries = Object.fromEntries(keyValuePairs);
  console.log(objFromEntries); // Output: { name: 'Alice', age: 30 }
  </example>
</object_literals>


<functions>
  - Write arrow functions over normal functions and take advantage of the implicit return.
  - When anonymous functions are used to process arrays, try to keep in one line and reduce the use of curly braces and `return` statements.
  - Use default parameters for functions to provide default values.
  - Use rest parameters to handle variable number of arguments.
  - Use destructuring in function parameters to extract values from objects and arrays.
  <example>
  ```ts
  // Functions with destructured parameters
  const printPerson = ({ name, age, city }): void =>
    console.log(`Name: ${name}, Age: ${age}, City: ${city}`);

  const printCoordinates = ([x, y]: [number, number]): void =>
    console.log(`X: ${x}, Y: ${y}`);

  const calculateSum = (...numbers: number[]): number =>
    numbers.reduce((total, num) => total + num, 0);

  const greet = (name: string = "Guest"): string => `Hello, ${name}!`;


  const coordinates: [number, number][] = [
    [10, 20, 30],
    [20, 30, 40],
    [30, 40, 50],
    [30, 40, 50],
    [30, 40, 50]
  ];

  const xyCoordinates = coordinates.map(([x, y]) => ({ x, y }));
  ```
  </example>
</functions>

<error_handling>
  - Use the `throw` statement to throw custom errors.
  - Use optional chaining (`?.`) to safely access nested properties without throwing an error if a property is `null` or `undefined`.
  - Use nullish coalescing operator (`??`) to provide a default value when dealing with `null` or `undefined`.
  - Take advantage of the logical assignment operators (`&&=`, `||=`, `??=`) to conditionally assign values.
  <example>
  ```ts
  /*
  A real-world use case might be in feature flagging, where you want to ensure both a feature flag and some condition are met:
  */
  let isFeatureEnabled = true;
  let userIsAdmin = false;

  // The feature will only be enabled for admin users
  isFeatureEnabled &&= userIsAdmin;  // isFeatureEnabled becomes false

  const greet = (name: string = ""): void => {
    name ||= "Guest";
    console.log(`Hello, ${name}!`);
  };

  greet(); // Outputs: "Hello, Guest!"
  greet("Alice"); // Outputs: "Hello, Alice!"

  /*
  In scenarios where you only want to set a default if a variable is genuinely absent and not just falsy, this operator shines:
  */
  let userPreferences = {
    theme: "",
    fontSize: null
  };

  userPreferences.theme ??= "dark";  // theme remains ""
  userPreferences.fontSize ??= 16;   // fontSize becomes 16
  ```
</example>
  - For error handling, use the `tryCatch` pattern for synchronous code to simulate Go's error handling.
  <example>
  ```ts
  const fetchData = (url: string): Promise<any> =>
    Promise.try(async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }).catch(error => {
      console.error("Error fetching data:", error);
      throw error;
    });

  const tryCatch = <T>(fn: () => T): [T, null] | [null, unknown] => {
    try {
      const result = fn();
      return [result, null];
    } catch (error) {
      return [null, error];
    }
  };

  const [data, error] = tryCatch(() => JSON.parse('{"key": "value"}'));
  if (error) {
    console.error("Error parsing JSON:", error);
  } else {
    console.log("Parsed data:", data);
  }
  ```
  </example>
  - Consider to use `Promise.try`, it executes a function and ensures it returns a promise. It is especially useful for writing cleaner and more predictable code.
  - Uses of `Promise.try` can be used to handle asynchronous operations in a more readable way, similar to the `try` block in synchronous code.
  <example>
  ```js
    // Wrapping synchronous code in a promise
    function syncFunction() {
      return "This is a synchronous result";
    }
    const promise = Promise.try(() => syncFunction());
    promise.then(result => {
        console.log(result); // Output: This is a synchronous result
    }).catch(err => {
        console.error(err);
    });
      ```
  </example>
  <example>
    ```js
    // Catching synchronous errors
    function throwError() {
      throw new Error("An error occurred!");
    }

    Promise.try(() => throwError())
      .then(result => {
        console.log(result);
      })
      .catch(err => {
        console.error(err.message); // Output: An error occurred!
    });
    ```
  </example>
  <example>
    ```js
    // Combining synchronous and asynchronous code
    function asyncFunction() {
      return new Promise(resolve => {
        setTimeout(() => resolve("Asynchronous result"), 1000);
    });
  }

    function syncFunction() {
      return "Synchronous result";
    }

    Promise.try(() => asyncFunction())
      .then(result => {
        console.log(result); // Output after 1 second: Asynchronous result
        return Promise.try(() => syncFunction());
      })
      .then(result => {
        console.log(result); // Output: Synchronous result
      })
      .catch(err => {
        console.error(err);
      });
    ```
  </example>
</error_handling>


<node_js>
- Use the `node:` prefix for built-in Node.js modules to avoid conflicts with user-defined modules.
- Use the `import.meta` object to access metadata about the current module, such as the URL of the module.
</node_js>

<web_api>
  - Never use the `innerHTML` to set or get HTML content. Instead, use `textContent` for text content and `document.createRange().createContextualFragment(htmlString)` for HTML strings.
  - Use the `CSSStyleSheet` interface to create and manipulate stylesheets. Use `CSSStyleRule` to create and manipulate CSS rules and the method `replaceSync(cssString)` to replace the content of a stylesheet.
  <example>
  ```js
  const greeting = "<h1>Hello, World!</h1>";
  const parser = document.createRange();
  const fragment = parser.createContextualFragment(greeting);

  document.body.appendChild(fragment);

  const styleSheet = new CSSStyleSheet();
  styleSheet.replaceSync(`
  body {
    background-color: lightblue;
  }
  h1 {
    color: navy;
    font-size: 24px;
  }
  `);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, styleSheet];
  ```
  </example>
</web_api>

</code_style>