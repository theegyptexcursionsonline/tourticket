# Testing Guide - Quick Reference

## Quick Start

```bash
# Install dependencies (already done)
npm install

# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm test:coverage

# Run specific test file
npm test -- DayTrips
```

## Project Structure

```
tourticket/
├── components/
│   ├── __tests__/
│   │   ├── DayTrips.test.tsx        ✅ 20/20 passing
│   │   └── FeaturedTours.test.tsx   🔄 24 tests
├── app/
│   ├── destinations/
│   │   └── __tests__/
│   │       └── DestinationPageClient.test.tsx  🔄 28 tests
│   └── admin/
│       └── destinations/
│           └── __tests__/
│               └── DestinationManager.test.tsx  🔄 20+ tests
├── jest.config.js                   # Jest configuration
├── jest.setup.js                    # Test setup & mocks
└── TEST_SUMMARY.md                  # Detailed test documentation
```

## Writing Tests

### Basic Test Structure

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyComponent from '../MyComponent'

describe('MyComponent', () => {
  beforeEach(() => {
    // Setup before each test
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### Testing Async Operations

```typescript
it('should fetch and display data', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: 'test' }),
  })

  render(<MyComponent />)

  await waitFor(() => {
    expect(screen.getByText('test')).toBeInTheDocument()
  })
})
```

### Testing User Interactions

```typescript
it('should handle button click', async () => {
  const user = userEvent.setup()
  render(<MyComponent />)

  const button = screen.getByRole('button', { name: /click me/i })
  await user.click(button)

  expect(screen.getByText('Clicked!')).toBeInTheDocument()
})
```

### Testing Forms

```typescript
it('should submit form with data', async () => {
  const user = userEvent.setup()
  const onSubmit = jest.fn()

  render(<MyForm onSubmit={onSubmit} />)

  await user.type(screen.getByLabelText(/name/i), 'John')
  await user.type(screen.getByLabelText(/email/i), 'john@example.com')
  await user.click(screen.getByRole('button', { name: /submit/i }))

  expect(onSubmit).toHaveBeenCalledWith({
    name: 'John',
    email: 'john@example.com',
  })
})
```

## Common Queries

### Finding Elements

```typescript
// By text
screen.getByText('Hello')
screen.getByText(/hello/i)  // Case insensitive

// By role
screen.getByRole('button', { name: /submit/i })
screen.getByRole('heading', { level: 1 })

// By label
screen.getByLabelText(/username/i)

// By test ID
screen.getByTestId('my-element')

// By placeholder
screen.getByPlaceholderText(/enter text/i)

// Multiple elements
screen.getAllByRole('button')
screen.getAllByText('Item')
```

### Query Variants

```typescript
// getBy* - Throws error if not found
screen.getByText('Hello')

// queryBy* - Returns null if not found
screen.queryByText('Hello')

// findBy* - Returns promise, waits for element
await screen.findByText('Hello')
```

## Mocking

### Mocking Hooks

```typescript
jest.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    formatPrice: (price: number) => `$${price}`,
  }),
}))
```

### Mocking Components

```typescript
jest.mock('@/components/Header', () => {
  return function MockHeader() {
    return <header data-testid="header">Header</header>
  }
})
```

### Mocking API Calls

```typescript
// Success
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ success: true, data: [] }),
})

// Error
global.fetch = jest.fn().mockResolvedValue({
  ok: false,
  status: 500,
  json: async () => ({ error: 'Server error' }),
})

// Network error
global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))
```

## Assertions

### Common Matchers

```typescript
// Existence
expect(element).toBeInTheDocument()
expect(element).not.toBeInTheDocument()

// Visibility
expect(element).toBeVisible()
expect(element).not.toBeVisible()

// Attributes
expect(element).toHaveAttribute('href', '/about')
expect(element).toHaveClass('active')

// Text content
expect(element).toHaveTextContent('Hello')
expect(element).toHaveValue('input value')

// Form elements
expect(input).toBeRequired()
expect(input).toBeDisabled()
expect(checkbox).toBeChecked()

// Functions
expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledWith(arg1, arg2)
expect(mockFn).toHaveBeenCalledTimes(2)
```

## Debugging Tests

### View rendered HTML

```typescript
import { screen } from '@testing-library/react'

// Log entire document
screen.debug()

// Log specific element
screen.debug(screen.getByRole('button'))

// Pretty print with syntax highlighting
screen.logTestingPlaygroundURL()
```

### Use Testing Playground

```typescript
// Add this to see interactive playground URL
screen.logTestingPlaygroundURL()
```

### Check what's rendered

```typescript
// If a query fails, it shows you what's available
screen.getByText('NonExistent')
// Error includes: "Here are the accessible roles..."
```

## Best Practices

### ✅ DO

- Test user behavior, not implementation details
- Use semantic queries (role, label, text)
- Test accessibility (ARIA labels, keyboard navigation)
- Mock external dependencies
- Keep tests independent and isolated
- Use descriptive test names
- Test error states and edge cases
- Use `waitFor` for async operations

### ❌ DON'T

- Test internal state directly
- Use container.querySelector unless necessary
- Rely on CSS classes for queries
- Test implementation details (function calls, props)
- Share state between tests
- Make tests dependent on each other
- Forget to clean up after tests
- Test third-party library internals

## Accessibility Testing

```typescript
it('should be accessible', async () => {
  render(<MyComponent />)

  // Check for proper labels
  expect(screen.getByLabelText(/username/i)).toBeInTheDocument()

  // Check for ARIA attributes
  const button = screen.getByRole('button')
  expect(button).toHaveAttribute('aria-label')

  // Check heading hierarchy
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

  // Check keyboard navigation
  const user = userEvent.setup()
  await user.tab()
  expect(screen.getByRole('button')).toHaveFocus()
})
```

## Coverage

### Generate Coverage Report

```bash
npm test:coverage
```

### Coverage Output

```
--------------------------|---------|----------|---------|---------|
File                      | % Stmts | % Branch | % Funcs | % Lines |
--------------------------|---------|----------|---------|---------|
components/               |   85.5  |   78.2   |   82.3  |   85.1  |
  DayTrips.tsx           |   95.2  |   88.5   |   92.1  |   95.0  |
  FeaturedTours.tsx      |   75.8  |   68.0   |   72.5  |   76.2  |
--------------------------|---------|----------|---------|---------|
```

## Troubleshooting

### Test times out

```typescript
// Increase timeout
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument()
}, { timeout: 5000 })
```

### Element not found

```typescript
// Use findBy for async elements
const element = await screen.findByText('Async content')

// Check if element exists without throwing
const element = screen.queryByText('Maybe exists')
if (element) {
  // Do something
}
```

### Mock not working

```typescript
// Clear mocks between tests
afterEach(() => {
  jest.clearAllMocks()
})

// Reset mocks completely
afterEach(() => {
  jest.resetAllMocks()
})
```

### Can't query by text

```typescript
// Text might be split across elements
screen.getByText('Hello', { exact: false })
screen.getByText(/hello/i)

// Use a function matcher
screen.getByText((content, element) => {
  return element.textContent === 'Hello World'
})
```

## Resources

- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Docs](https://jestjs.io/docs/getting-started)
- [Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Testing Playground](https://testing-playground.com/)

## Example: Complete Test File

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyComponent from '../MyComponent'

// Mock dependencies
jest.mock('@/hooks/useData', () => ({
  useData: () => ({ data: 'test', loading: false }),
}))

describe('MyComponent', () => {
  const mockProps = {
    title: 'Test Title',
    onAction: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render with props', () => {
      render(<MyComponent {...mockProps} />)
      expect(screen.getByText('Test Title')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should handle button click', async () => {
      const user = userEvent.setup()
      render(<MyComponent {...mockProps} />)

      await user.click(screen.getByRole('button'))
      expect(mockProps.onAction).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should display error message', () => {
      render(<MyComponent {...mockProps} error="Test error" />)
      expect(screen.getByText('Test error')).toBeInTheDocument()
    })
  })
})
```

---

**Need help?** Check TEST_SUMMARY.md for detailed test coverage information!
