# Lifting React

The code transformation works like a charm, except that it breaks as soon as it needs to interop with external code by passing callbacks to that code.

For example, if the student writes

```js
[1, 2, 3].map(n => n + 10);
```

this gets transformed to (summarizing)

```js
[yield _e(1), yield _e(2), yield _e(3)].map(
  function*(n) { /* ... */ }
);
```

And passing a generator as a callback into `Array::map` is simply not allowed. Hence, the `Array::map` method needs to be _lifted_ to work with generators as well:

```js
Array.prototype.map = function*(callback) {
  const mapped = [];
  for (let i = 0; i < this.length; i++) {
    mapped[i] = yield* callback(this[i], i, this);
  }
  return mapped;
};
```

Or, actually, in order to not break the whole execution environment with an ugly monkey-patch:

```js
const _Array_map = Array.prototype.map;
Array.prototype.map = function(callback) {
  return (callback instanceof function*() {}.constructor
    ? function*(callback) {
        const mapped = [];
        for (let i = 0; i < this.length; i++) {
          mapped[i] = yield* callback(this[i], i, this);
        }
        return mapped;
      }
    : _Array_map
  ).apply(this, arguments);
};
```

So here's the killer question: how much work would it take to lift enough of React for a proof-of-concept? (Or is there a better way?)

_(Mathematically speaking, it would be as simple as running the same transform on the React source-code. But I can't imagine this would go easily at all, I can only imagine that manually lifting the important aspects is still easier.)_

I.e. what to do with this:

```jsx
<MySteppedComponent /> // ???

function* MySteppedComponent() {
  yield _stm();
  const [count, set_count] = (yield _e(useState))(yield _e(0));

  yield _stm();
  return ...;
}
```

Options

- **Write a higher-order component (or otherwise), and implement fully self-owned versions of `useState`, `useEffect`, etc.**
- Writing a different renderer for React, which only lifts the render phase, keeps the reconciler

Good news, the first option can work

Transform:

```js
function MySteppedExecutionComponent({ someProp }) {
  const [count, set_count] = useState(5);
  const [str, set_str] = useState("ok");
  const increment = () => {
    set_count(count + 1);
  };
  return (
    <div>
      count: {count} <button onClick={increment}>increment</button> and some
      prop: {someProp}
    </div>
  );
}
```

Not just into:

```js
function* MySteppedExecutionComponent({ someProp }) {
  yield _stm();
  // etc...
}
```

But into:

```js
function MySteppedExecutionComponent(props) {
  const [renders, set_renders] = React.useState([makeNewRenderState()]);
  const [scheduled, set_scheduled] = React.useState(false);
  const startRerender = () => {
    set_renders([makeNewRenderState(), ...renders]);
    set_scheduled(false);
  };

  function makeNewRenderState() {
    return {
      iterator: MySteppedExecutionComponent(props),
      props,
      i: 0,
      hookno: -1,
      done: false
    };
  }

  const stateHooks = React.useRef({}).current;
  function useState(initialValue) {
    const key = ++renders[0].hookno;
    console.log(
      `useState#${key}`,
      stateHooks[key] ? stateHooks[key][0] : "<new>"
    );
    if (!stateHooks[key]) {
      stateHooks[key] = [
        initialValue,
        newValue => {
          console.log(`setting state of useState#${key} to`, newValue);
          stateHooks[key][0] = newValue;
          set_scheduled(true);
        }
      ];
    }
    return stateHooks[key];
  }

  // And similar for useEffect (and useMemo/useCallback/useRef/...)

  function* MySteppedExecutionComponent({ someProp }) {
    yield _stm();
    // etc...
  }

  const step = () => {
    const { done, value } = renders[0].iterator.next(renders[0].value);
    set_renders([
      {
        ...renders[0],
        i: renders[0].i + 1,
        done,
        value
      },
      ...renders.slice(1)
    ]);
  };

  const needsRerender = scheduled || _differentProps(renders[0].props, props);
  const lastCompleteRender = renders.find(r => r.done);

  // Either the minimal:
  return lastCompleteRender ? lastCompleteRender.value : null;

  // Or some stepper control UI:
  return (
    <div>
      <div>
        {lastCompleteRender ? (
          lastCompleteRender.value
        ) : (
          <span>Has not completed initial rendering yet</span>
        )}
      </div>
      <p>
        At {renders[0].i}{" "}
        {renders[0].done ? (
          <strong>DONE</strong>
        ) : (
          <button onClick={step}>Step</button>
        )}{" "}
        {needsRerender &&
          (renders[0].done ? (
            <span>
              <em>Needs a rerender</em>{" "}
              <button onClick={startRerender}>Rerender now</button>
            </span>
          ) : (
            <em>Will need a rerender</em>
          ))}
      </p>
    </div>
  );
}

function _differentProps(a, b) {
  return (
    Object.keys(a).some(k => a[k] !== b[k]) ||
    Object.keys(b).some(k => a[k] !== b[k])
  );
}
```
