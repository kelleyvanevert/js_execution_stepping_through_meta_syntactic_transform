## Transforming function calls

### Pseudocode

```
o.p(...a)

  ->

_wrap((_CACHE[o.id] = o).p.call(_CACHE[o.id], ...a))
```

### AST

```
CallExpression{
  callee: MemberExpression{
    o = object,
    p = property,
    c = computed
  },
  a = arguments
}

  ->

CallExpression{
  callee: "_wrap",
  arguments: [
    CallExpression{
      callee: MemberExpression{
        object: MemberExpression{
          object: AssignmentExpression{
            operator: "=",
            left: MemberExpression{
              object: "_CACHE",
              property: o.id,
              computed: true
            },
            right: o
          },
          property: p,
          computed: c
        },
        property: "call"
      },
      arguments: [
        MemberExpression{
          object: "_CACHE",
          property: o.id,
          computed: true
        },
        ...a
      ]
    }
  ]
}
```

### Helpers

The helper `_wrap(r)` detects whether its argument is the result of a normal function, or the result of a student-defined function, now turned into a stepper. To make both work the same, we turn the former into a stepper artificially:

```js
(function*() {
  return r;
})();
```
