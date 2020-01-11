import "@babel/register";
import "@babel/preset-stage-1";
import "@babel/preset-react";
import "@babel/plugin-syntax-jsx";
import "@babel/preset-env-standalone";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";
import stripIndent from "common-tags/lib/stripIndent";

function _json(data) {
  if (typeof data === "string") {
    return t.stringLiteral(data);
  } else if (typeof data === "number") {
    return t.numericLiteral(data);
  } else if (data === null) {
    return t.nullLiteral();
  } else if (data === void 0) {
    return t.identifier("undefined");
  } else if (data instanceof Array) {
    return t.arrayExpression(data.map(_json));
  } else {
    return t.objectExpression(
      Object.entries(data).map(([key, value]) => {
        return t.objectProperty(t.stringLiteral(key), _json(value));
      })
    );
  }
}

function wrapExpression(expressionNode) {
  return t.sequenceExpression([
    t.yieldExpression(
      t.callExpression(t.identifier("__viz.expr"), [
        _json(expressionNode.type)
        // _json({
        //   loc: path.node.loc,
        //   type: path.node.type
        // })
      ])
    ),
    expressionNode
  ]);
}

export default function gen(code) {
  let _i = 0;
  try {
    const ast = parse(code, {
      sourceType: "module",
      plugins: ["jsx"]
    });

    console.log(ast);

    let __cached_object_id = -1;

    // transform the ast
    const visitor = {
      Statement(path) {
        if (t.isBlockStatement(path.node)) return;

        path.insertBefore(
          t.expressionStatement(
            t.yieldExpression(
              t.callExpression(t.identifier("__viz.stm"), [
                _json(path.node.type)
                // _json({
                //   loc: path.node.loc,
                //   type: path.node.type
                // })
              ])
            )
          )
        );

        const p = path.getSibling(path.key - 1);
        p.skip();
      },
      ArrowFunctionExpression(path) {
        path.replaceWith(
          t.callExpression(
            t.memberExpression(
              t.functionExpression(
                null,
                path.node.params,
                path.node.body,
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
          .traverse(visitor);
        // * Will be replaced with a generator function hereafter
        // * TODO: make semantically similar again (bind `this`)
      },
      FunctionExpression(path) {
        if (path.node.generator) {
          throw new Error("I don't support generator functions yet :|");
        }
        path.node.generator = true;
      },
      FunctionDeclaration(path) {
        if (path.node.generator) {
          throw new Error("I don't support generator functions yet :|");
        }
        path.node.generator = true;
      },
      Expression: {
        exit(path) {
          console.log("e", path.node.type);
          path.replaceWith(wrapExpression(path.node));
          path.skip();
        }
      }
    };

    traverse(ast, visitor);

    const generated = generate(ast, {
      presets: ["react"]
    });

    return stripIndent`
      function* __viz() {
        const __cached_objects = {};
      GEN
      }
      __viz.stm = function (meta) {
        console.log("executing statement:", meta);
      };
      __viz.expr = function (meta) {
        console.log("evaluating/executing expression:", meta);
      };
      __viz;
    `.replace(
      "GEN",
      generated.code
        .split("\n")
        .map(line => "  " + line)
        .join("\n")
    );
  } catch (e) {
    console.error("BABEL ERROR", e);
    return;
  }
}

function* hi() {
  const h0 = [f(3), 4];

  const h1 = yield _expr([
    yield* _lift((yield _expr(f)).call(_cache[5], yield _expr(3))),
    yield _expr(4)
  ]);
}
