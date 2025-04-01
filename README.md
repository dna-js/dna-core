# DNA Core

A monorepo containing multiple packages for building modern web applications.

## Packages

- `@dna-core/math`: A simple math library with basic arithmetic operations
- `@dna-core/react-app`: A React application that demonstrates the usage of the math library

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/dna-core.git
cd dna-core
```

2. Install dependencies:
```bash
yarn install
```

### Development

To start development:

```bash
# Start both packages in development mode
yarn dev

# Or start individual packages
cd packages/math && yarn dev
cd packages/react-app && yarn dev
```

### Building

To build all packages:

```bash
yarn build
```

### Testing

To run tests:

```bash
yarn test
```

## Project Structure

```
dna-core/
├── packages/
│   ├── math/           # Math library package
│   └── react-app/      # React application package
├── package.json        # Root package.json
└── lerna.json         # Lerna configuration
```

## Development Workflow

1. Development uses Webpack for hot reloading and debugging
2. Production builds use Rollup for optimized bundles
3. Both packages share the same TypeScript configuration
4. Jest is used for unit testing across all packages

## License

MIT 