import { defineVarType, getVarType } from '../src';

// Define a User type with custom toString
defineVarType("User", {
  defaultValue: {
    id: "",
    name: "",
    age: 0,
    email: ""
  },
  toString: (value) => `${value.name} (${value.age})`
});

// Define a Color type with custom toString
defineVarType("Color", {
  defaultValue: {
    r: 0,
    g: 0,
    b: 0
  },
  toString: (value) => `rgb(${value.r}, ${value.g}, ${value.b})`
});

// Define a DateRange type with custom toString
defineVarType("DateRange", {
  defaultValue: {
    start: new Date(),
    end: new Date()
  },
  toString: (value) => `${value.start.toLocaleDateString()} - ${value.end.toLocaleDateString()}`
});

// Code snippets for display
const codeSnippets = {
  user: `defineVarType("User", {
    defaultValue: {
      id: "",
      name: "",
      age: 0,
      email: ""
    },
    toString: (value) => \`\${value.name} (\${value.age})\`
  });`,
  color: `defineVarType("Color", {
    defaultValue: {
      r: 0,
      g: 0,
      b: 0
    },
    toString: (value) => \`rgb(\${value.r}, \${value.g}, \${value.b})\`
  });`,
  dateRange: `defineVarType("DateRange", {
    defaultValue: {
      start: new Date(),
      end: new Date()
    },
    toString: (value) => \`\${value.start.toLocaleDateString()} - \${value.end.toLocaleDateString()}\`
  });`
};

// Function to create and display examples
function createExamples() {
  const container = document.getElementById('examples-container');
  if (!container) return;

  // User example
  const user = {
    id: "1",
    name: "John Doe",
    age: 30,
    email: "john@example.com"
  };
  const userType = getVarType("User");
  const userToString = userType?.toString?.(user) || String(user);
  
  container.innerHTML += `
    <div class="example-card">
      <h3>User Type Example</h3>
      <div class="code-snippet">
        <h4>Type Definition:</h4>
        <pre><code>${codeSnippets.user}</code></pre>
      </div>
      <div class="value-display">
        <h4>Example Value:</h4>
        <pre>${JSON.stringify(user, null, 2)}</pre>
        <div class="toString-result">
          <strong>toString result:</strong> ${userToString}
        </div>
      </div>
    </div>
  `;

  // Color example
  const color = {
    r: 255,
    g: 128,
    b: 0
  };
  const colorType = getVarType("Color");
  const colorToString = colorType?.toString?.(color) || String(color);
  
  container.innerHTML += `
    <div class="example-card">
      <h3>Color Type Example</h3>
      <div class="code-snippet">
        <h4>Type Definition:</h4>
        <pre><code>${codeSnippets.color}</code></pre>
      </div>
      <div class="value-display">
        <h4>Example Value:</h4>
        <pre>${JSON.stringify(color, null, 2)}</pre>
        <div class="toString-result">
          <strong>toString result:</strong> ${colorToString}
        </div>
        <div class="color-preview" style="background-color: ${colorToString}"></div>
      </div>
    </div>
  `;

  // DateRange example
  const dateRange = {
    start: new Date('2024-01-01'),
    end: new Date('2024-12-31')
  };
  const dateRangeType = getVarType("DateRange");
  const dateRangeToString = dateRangeType?.toString?.(dateRange) || String(dateRange);
  
  container.innerHTML += `
    <div class="example-card">
      <h3>DateRange Type Example</h3>
      <div class="code-snippet">
        <h4>Type Definition:</h4>
        <pre><code>${codeSnippets.dateRange}</code></pre>
      </div>
      <div class="value-display">
        <h4>Example Value:</h4>
        <pre>${JSON.stringify(dateRange, null, 2)}</pre>
        <div class="toString-result">
          <strong>toString result:</strong> ${dateRangeToString}
        </div>
      </div>
    </div>
  `;
}

// Initialize examples when the page loads
document.addEventListener('DOMContentLoaded', createExamples); 