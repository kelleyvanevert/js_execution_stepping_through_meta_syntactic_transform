# A visualizer for React function component execution and hooks, using a meta-syntactic transform

## Why?

- Because I want to visualize the React render pipeline, and how hook state management works, etc.
- Because I wanted to do this with as little tedious code as possible
- Because I wanted to play around with Babel

## How does it work?

Using Babel, I syntactically transform the student's React code, in order to add a React-gnostic "management layer" between.

This is roughly speaking what it looks like:

### The student's code

```
export default function App() {
  const [count, set_count] = useState(0);

  const increment = () => {
    set_count(count + 1);
  };

  return (
    <div>
      Count: {count}
      <button onClick={increment}>increment</button>
    </div>
  );
}
```

### The transformed code

```
export default function App() {
  function S() {
    const [count, set_count] = useState(0);

    function S() {
      const increment = () => {
        set_count(count + 1);
      };

      function S() {
        return (
          <div>
            Count: {count}
            <button onClick={increment}>increment</button>
          </div>
        );
      }
      return <Step step={S} />;
    }
    return <Step step={S} />;
  }
  return <Step step={S} />;
};
```
