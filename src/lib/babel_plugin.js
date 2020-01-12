export default function(babel) {
  const { types: t } = babel;

  function json(data) {
    if (typeof data === "string") {
      return t.stringLiteral(data);
    } else if (typeof data === "number") {
      return t.numericLiteral(data);
    } else if (data === null) {
      return t.nullLiteral();
    } else if (data === void 0) {
      return t.identifier("undefined");
    } else if (data instanceof Array) {
      return t.arrayExpression(data.map(json));
    } else {
      return t.objectExpression(
        Object.entries(data).map(([key, value]) => {
          return t.objectProperty(t.stringLiteral(key), json(value));
        })
      );
    }
  }

  let _cache_id = -1;

  let Q = 0;
  function preventloop() {
    if (++Q > 1000) {
      throw new Error("LOOP");
    }
  }

  function meta(node) {
    // return json(node.type);
    return json({
      loc: node.loc,
      type: node.type
    });
  }

  // A dirty trick to get expressionPath.traverse(visitor)
  //  to work also on the top level expression:
  //  just perform it on a sequence expression wrapped
  //  version of the expression
  function u(expressionNode) {
    return t.sequenceExpression([expressionNode]);
  }

  const visitor = {
    Statement(path) {
      if (t.isBlockStatement(path.node)) return;

      path.insertBefore(
        t.expressionStatement(
          t.yieldExpression(
            t.callExpression(t.identifier("_app._stm"), [meta(path.node)])
          )
        )
      );

      const p = path.getSibling(path.key - 1);
      p.skip();
    },
    Function(path) {
      if (path.node.generator) {
        throw new Error("Generator functions are not supported yet");
      }

      if (t.isArrowFunctionExpression(path)) {
        const block = t.isBlockStatement(path.node.body);

        path.replaceWith(
          t.callExpression(
            t.memberExpression(
              t.functionExpression(
                null,
                path.node.params,
                block
                  ? path.node.body
                  : t.blockStatement([t.returnStatement(path.node.body)]),
                true
              ),
              t.identifier("bind")
            ),
            [t.thisExpression()]
          )
        );

        path.skip();
        path
          .get("callee")
          .get("object")
          .get("body")
          .traverse(visitor); // recurse
      } else {
        path.node.generator = true;
      }
    },
    Expression(path) {
      // console.log("E", path.node.type, "@", path.node.loc.start);
      // preventloop();

      if (t.isCallExpression(path)) {
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
            t.callExpression(t.identifier("_app._expr"), [
              meta(path.node),
              t.yieldExpression(
                t.callExpression(t.identifier("_app._lift"), [
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

        const expr = path.get("argument").get("arguments")[1];
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
        path.replaceWith(
          t.yieldExpression(
            t.callExpression(t.identifier("_app._expr"), [
              meta(path.node),
              path.node
            ])
          )
        );
        path.skip();

        path
          .get("argument")
          .get("arguments")[1]
          .traverse(visitor); // recurse
      }
    }
  };

  return {
    name: "stepperize",
    visitor
  };
}
