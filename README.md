# Visualizing JS execution through a meta-syntactic transform

The idea is to translate code like this:

```js
function X(...) {
  S_0; // at source loc_0
  S_1; // at source loc_1
  ...  // ...
}

... expr ... // at source loc_expr

... X(...) ... // at source loc_fn_call
```

into:

```js
function* X(...) {
  yield _viz({ loc: loc_0 });
  S_0;
  yield _viz({ loc: loc_1 });
  S_1;
  ...
}

... (yield _viz_expr({ loc: loc_expr }), expr) ...

... (yield _viz_fn_call({ loc: loc_fn_call, fn: X, args: ... })) ...
```

## An example

Translate:

```js
const kelley = {
  name: "Kelley",
  age: 27
};

const heleen = {
  name: "Heleen",
  age: 24
};

const elsie = {
  name: "Elsie",
  age: 22
};

const siblings = [kelley, heleen, elsie];

const names = siblings.map(person => {
  return person.name;
});

console.log(names);
```

into:

```js
yield _stm(meta);
const kelley = (yield _expr({
  name: (yield _expr("Kelley", meta)),
  age: (yield _expr(27, meta))
}, meta));

yield _stm(meta);
const heleen = (yield _expr({
  name: (yield _expr("Heleen", meta)),
  age: (yield _expr(24, meta))
}), meta);

yield _stm(meta);
const elsie = (yield _expr({
  name: (yield _expr("Elsie", meta)),
  age: (yield _expr(22, meta))
}), meta);

yield _stm(meta);
const siblings = (yield _expr([
  (yield _expr(kelley, meta)),
  (yield _expr(heleen, meta)),
  (yield _expr(elsie, meta))
]), meta);

yield _stm(meta);
const names = (yield _expr(siblings, meta)).map(person => {
  yield _stm(meta);
  return (yield _expr((yield _expr(person, meta)).name), meta);
});

yield _stm(meta);
console.log((yield _expr(names, meta)));
```

## Calling member expression

Without intervention, we'd translate this

```js
[].map(f);
```

into this

```js
_expr(_expr([], meta).map, meta)(_expr(f, meta));
```

But that's not good enough, we need to include the context in the call. So we should translate it into this

```js
_expr((_TMP = _expr([], meta).map), meta).call(_TMP, _expr(f, meta));
```

## Alternative

```js
a.b

yield _expr((yield _expr(a, meta)).b, meta)

(yield _expr(meta), (yield _expr(meta), a).b)
```
