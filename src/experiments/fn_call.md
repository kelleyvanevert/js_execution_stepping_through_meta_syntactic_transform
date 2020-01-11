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

### Quick implementation

```js
export default function(babel) {
  const { types: t } = babel;

  let _cache_id = -1;

  let Q = 0;
  function preventloop() {
    if (++Q > 200) {
      throw new Error("LOOP");
    }
  }

  // A dirty trick to get expressionPath.traverse(visitor)
  //  to work also on the top level expression:
  //  just perform it on a sequence expression wrapped
  //  version of the expression
  function u(expressionNode) {
    return t.sequenceExpression([expressionNode]);
  }

  const visitor = {
    Expression(path) {
      console.log("E", path.node.type, "@", path.node.loc.start);
      preventloop();

      if (t.isCallExpression(path)) {
        console.log("found");
        const contextual = t.isMemberExpression(path.get("callee"));

        // Automatically works even if non-contextual,
        //  because then the absence of the assignment,
        //  the cached item will undefined
        const cached_context = t.memberExpression(
          t.identifier("_cache"),
          t.numericLiteral(++_cache_id),
          true
        );

        const computed = contextual ? path.node.callee.computed : "irrelevant";

        path.replaceWith(
          t.yieldExpression(
            t.callExpression(t.identifier("_lift"), [
              t.callExpression(
                t.memberExpression(
                  contextual
                    ? t.memberExpression(
                        t.assignmentExpression(
                          "=",
                          cached_context,
                          u(path.node.callee.object)
                        ),
                        computed
                          ? u(path.node.callee.property)
                          : path.node.callee.property,
                        computed
                      )
                    : u(path.node.callee),
                  t.identifier("call")
                ),
                [cached_context, ...path.node.arguments.map(u)]
              )
            ]),
            true
          )
        );

        path.skip();

        const call = path.get("argument").get("arguments")[0];
        let caller = call.get("callee").get("object");
        if (contextual) {
          caller
            .get("object")
            .get("right")
            .traverse(visitor); // recurse
          if (computed) {
            caller.get("property").traverse(visitor); // recurse
          }
        } else {
          caller.traverse(visitor); // recurse
        }
        call
          .get("arguments")
          .slice(1)
          .forEach(argPath => {
            argPath.traverse(visitor); // recurse
          });
      }
    }
  };

  return {
    name: "ast-transform", // not required
    visitor
  };
}
```

### Full implementation

```js
export default function(babel) {
  const { types: t } = babel;

  let _cache_id = -1;

  let Q = 0;
  function preventloop() {
    if (++Q > 200) {
      throw new Error("LOOP");
    }
  }

  // A dirty trick to get expressionPath.traverse(visitor)
  //  to work also on the top level expression:
  //  just perform it on a sequence expression wrapped
  //  version of the expression
  function u(expressionNode) {
    return t.sequenceExpression([expressionNode]);
  }

  const visitor = {
    Expression(path) {
      // console.log("E", path.node.type, "@", path.node.loc.start);
      preventloop();

      if (t.isCallExpression(path)) {
        console.log("found");
        const contextual = t.isMemberExpression(path.get("callee"));

        // Automatically works even if non-contextual,
        //  because then the absence of the assignment,
        //  the cached item will undefined
        const cached_context = t.memberExpression(
          t.identifier("_cache"),
          t.numericLiteral(++_cache_id),
          true
        );

        const computed = contextual ? path.node.callee.computed : "irrelevant";

        path.replaceWith(
          t.yieldExpression(
            t.callExpression(t.identifier("_expr"), [
              t.yieldExpression(
                t.callExpression(t.identifier("_lift"), [
                  t.callExpression(
                    t.memberExpression(
                      contextual
                        ? t.memberExpression(
                            t.assignmentExpression(
                              "=",
                              cached_context,
                              u(path.node.callee.object)
                            ),
                            computed
                              ? u(path.node.callee.property)
                              : path.node.callee.property,
                            computed
                          )
                        : u(path.node.callee),
                      t.identifier("call")
                    ),
                    [cached_context, ...path.node.arguments.map(u)]
                  )
                ]),
                true
              )
            ])
          )
        );

        path.skip();

        const expr = path.get("argument").get("arguments")[0];
        const call = expr.get("argument").get("arguments")[0];
        let caller = call.get("callee").get("object");
        if (contextual) {
          caller
            .get("object")
            .get("right")
            .traverse(visitor); // recurse
          if (computed) {
            caller.get("property").traverse(visitor); // recurse
          }
        } else {
          caller.traverse(visitor); // recurse
        }
        call
          .get("arguments")
          .slice(1)
          .forEach(argPath => {
            argPath.traverse(visitor); // recurse
          });
      } else {
        console.log("otherwise", path.node.type);
        path.replaceWith(
          t.yieldExpression(
            t.callExpression(t.identifier("_expr"), [path.node])
          )
        );
        path.skip();

        path
          .get("argument")
          .get("arguments")[0]
          .traverse(visitor); // recurse
      }
    }
  };

  return {
    name: "ast-transform", // not required
    visitor
  };
}
```
