# Visualizing JS execution through a meta-syntactic transform

## Previous/other work

- [An earlier attempt at visualizing JS execution](https://visualized-execution.js.org/), by hand-constructing a basic interpreter for the whole language. This is tedious of course, but does lead to very fine-grained control, with all the accompanying visualization perks.

- [A React hooks execution visualizer](<https://lihautan.com/react-hooks-visualiser/#?code=%0Aexport%20default%20function%20LikeCounter()%20%7B%0A%20%20const%20initial_numLikes%20%3D%200%3B%0A%20%20const%20%5BnumLikes%2C%20set_numLikes%5D%20%3D%20useState(initial_numLikes)%3B%20%2F%2F%20%3C-%20using%20state!%0A%0A%20%20const%20increment%20%3D%20()%20%3D%3E%20%7B%0A%20%20%20%20console.log(%22Yes%2C%20clicked!%20Current%20number%20of%20likes%3A%22%2C%20numLikes)%3B%0A%20%20%20%20set_numLikes(numLikes%20%2B%201)%3B%0A%20%20%7D%3B%0A%0A%20%20return%20(%0A%20%20%20%20%3Cdiv%3E%0A%20%20%20%20%20%20%3Cp%3E%0A%20%20%20%20%20%20%20%20This%20post%20has%20%3Cb%3E%7BnumLikes%7D%3C%2Fb%3E%20likes!%0A%20%20%20%20%20%20%20%20%3Cbutton%20onClick%3D%7Bincrement%7D%3ELike%3C%2Fbutton%3E%0A%20%20%20%20%20%20%3C%2Fp%3E%0A%20%20%20%20%3C%2Fdiv%3E%0A%20%20)%3B%0A%7D%0A>) that sparked renewed interested in execution visualization efforts, because of the strictly harder context.

## Artefacts

- [AST explorer with the transpiler](https://astexplorer.net/#/gist/ca504f9c414704245b5b4bf816bcf4dd/latest)
- [CodeSandbox with the React interop idea](https://codesandbox.io/s/generator-react-components-uwhtz?fontsize=14&hidenavigation=1&theme=dark)

## The idea in a nutshell

The idea is to _transpile_ ("lift") a piece of normal JavaScript code into _one giant iterator_, that performs two tasks simultaneously, while stepping through:

- execution the original code _as it was_;
- and _yielding_ back execution information for visualization purposes.

For example, we'd take this code:

```js
function app() {
  const js = {
    invented: 1995,
    usage: "everywhere",
    paradigms: [
      "multi",
      "event-driven",
      "imperative",
      "functional",
      "object-oriented"
    ]
  };
}
```

and translate it into something like this:

```js
function* app() {
  yield _stm("VariableDeclaration", ...);
  const js = yield _expr("ObjectExpression", ..., {
    invented: yield _expr("NumericLiteral", ..., 1995),
    usage: yield _expr("StringLiteral", ..., "everywhere"),
    paradigms: yield _expr("ArrayLiteral", ..., [
      yield _expr("StringLiteral", ..., "multi"),
      yield _expr("StringLiteral", ..., "event-driven"),
      yield _expr("StringLiteral", ..., "imperative"),
      yield _expr("StringLiteral", ..., "functional"),
      yield _expr("StringLiteral", ..., "object-oriented")
    ])
  });
}
```

At the places of the ellipses, we'd put information about the origin source location of the AST node, so that we would be able to highlight the relevant code while stepping through the program.

Important detail: we also need to transpile all user-defined functions into generator functions, and then yield over control to them when calling them. For example:

```js
function* userFn() {
  // ...
}

yield* userFn(...)
```

This also means that generator functions are not supported in the user's code 🤷‍♀️ (until I spend some time cleverly crafting their transpilation somehow).

## Some notable and mostly overcome problems

### Syntactic call-site context binding of function invocations

It was a bit tricky to get function calling to work as expected. JavaScript has an odd language feature where the semantics of a call expression depends on whether the callee is syntactically either a member expression or not. I call this _syntactic call-site context binding._ For example, `o.f(41)` sets `this` inside of the function to be `o`, whereas `(yield _expr(..., o.f))(41)`, even though the callee still refers to the same function, sets `this` inside of the function to `undefined` (or whatever). To overcome this problem, you have to perform a more subtle transpilation. The end-result is as follows.

We transpile JS like this:

```js
o.f(a, b);
```

into stuff like this:

```js
yield _expr("o.f(a, b)",
  yield* (
    (yield _expr("o.f", (yield _expr("o", TMP = o)).f))
      .call(
        TMP,
        yield _expr("a", a),
        yield _expr("b", b)
      )
  )
)
```

Note the temporary storage of the object expression, because it might be a complex expression which should not be evaluated twice. Also, if the member expression is computed (with brackets `[ ]`), the computed property should also be transpiled correctly.

### Interop with the standard library and other code

We're "lifting" the code to a different execution semantics. This also means that interop is broken unless cleverly avoided/fixed. There's two "directions" in which the interopability needs fixing: gettings results _back_ from non-user-defined functions, and _passing callbacks_ to other code. (Data is still data, so there's no worry there.)

The first problem is reasonably easily solved (disregarding some edge-cases that would require more work). We can just conditionally _lift_ the result of function calls:

```js
yield* _lift(r = (/* some call expression */))
```

If the function call result is an iterator as a result of our own making, we can leave it be, and if it's just data, we simply lift it to be a trivial iterator:

```js
(function*() {
  return r;
})();
```

The second problem is considerably harder, because we will be passing our lifted callback functions into all kinds of unknowing APIs:

```js
(/* some array expression */).map(function* (number) {
  yield _stm("ReturnExpression");
  return yield _expr(...);
})
```

I don't think there's any way to cleverly side-step this problem, we just have to make sure these APIs happen to work with iterators as well. For the sake of our visualizer though, that usually doesn't mean much more than the common standard library functions like `Array::map`, etc. And this is totally achievable with a bit of old-school (gotta love JavaScript!) monkey-patching:

```js
const _Array_map = Array.prototype.map;
Array.prototype.map = function(callback) {
  return (callback instanceof function*() {}.constructor
    ? function*(callback) {
        console.log("!! using lifted version of Array::map");
        const mapped = [];
        for (let i = 0; i < this.length; i++) {
          mapped[i] = yield* callback(this[i], i, this);
        }
        return mapped;
      }
    : _Array_map
  ).apply(this, arguments);
};

// etc.
```

### Interop with React

But then here's the main kicker: I don't only want to use this visualizer for plain JavaScript execution, but also (separately) for the visualization of the React hooks render process. (To show the hooks' "hidden" underlying state, and how the whole function gets called on every render, etc.) This is another (quircky) case of an API that needs to be "lifted" to be able to work with iterators/generators. Because how do we deal with a situation like this?

```js
function* MyTranspiledComponent() {
  yield _stm("VariableDeclaration");
  const [count, set_count] = ...;
  // etc.
}

<MyTranspiledComponent /> // ???
```

_(Mathematically speaking, you might say we just run the transpiler on the whole React codebase. Although I admit it didn't even try, I can't imagine this would work, haha.)_

I haven't solved this problem entirely yet, but my current goals is to make it work with a special-purpose transpilation step for component definition functions which basically just implements own versions of the most important hooks. _(The real problem is not so much the delayed render, but the conditional/delayed hook calls. Hence the need to reimplement them.)_ This will look something like this (_TENTATIVE SKETCH ALERT_):

```js
function MyTranspiledComponent(props) {
  const [renders, set_renders] = React.useState([makeNewRenderState()]);
  const [scheduled, set_scheduled] = React.useState(false);
  const startRerender = () => {
    set_renders([makeNewRenderState(), ...renders]);
    set_scheduled(false);
  };

  function makeNewRenderState() {
    return {
      iterator: MyTranspiledComponent(props),
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

  function* MyTranspiledComponent({ someProp }) {
    yield _stm("VariableDeclaration");
    const [count, set_count] = ...;
    // etc.
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
```
