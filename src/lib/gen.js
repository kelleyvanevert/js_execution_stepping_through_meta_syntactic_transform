import "@babel/register";
import "@babel/preset-stage-1";
import "@babel/preset-react";
import "@babel/plugin-syntax-jsx";
import "@babel/preset-env-standalone";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import { transform } from "@babel/standalone";
import * as t from "@babel/types";

function _json(data) {
  if (typeof data === "string") {
    return t.stringLiteral(data);
  } else if (typeof data === "number") {
    return t.numericLiteral(data);
  } else if (data === null) {
    return t.nullLiteral();
  } else if (data === void 0) {
    return t.tsUndefinedKeyword();
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

export default function gen(code) {
  try {
    const ast = parse(code, {
      sourceType: "module",
      plugins: ["jsx"]
    });
    console.log("ast", ast);

    // transform the ast
    traverse(ast, {
      FunctionDeclaration(path) {
        if (t.isProgram(path.parent)) {
          const componentName = path.node.id.name;
          path.replaceWith(
            t.variableDeclaration("const", [
              t.variableDeclarator(
                path.node.id,
                t.callExpression(t.identifier("_LIB.component"), [
                  t.functionExpression(null, path.node.params, path.node.body),
                  _json(componentName),
                  _json(path.node.loc)
                ])
              )
            ])
          );
          _reduceBody(
            path
              .get("declarations")[0]
              .get("init")
              .get("arguments")[0]
              .get("body"),
            componentName
          );
        } else if (t.isExportDefaultDeclaration(path.parent)) {
          const componentName = path.node.id.name;
          path.replaceWith(
            t.callExpression(t.identifier("_LIB.component"), [
              t.functionExpression(null, path.node.params, path.node.body),
              _json(componentName),
              _json(path.node.loc)
            ])
          );
          _reduceBody(path.get("arguments")[0].get("body"), componentName);
        }
      }
    });

    const generated = generate(ast, {
      presets: ["react"]
    });

    // Finally, transform again, this time compiling JSX
    return transform(generated.code, {
      presets: ["env", "react"]
    }).code;
  } catch (e) {
    console.error("BABEL ERROR", e);
    return "BABEL ERROR";
  }
}

function _reduceBody(block_path, componentName) {
  const stmts = block_path.node.body.reduceRight(
    (statements, prev, statementIndex) => {
      return [
        t.functionDeclaration(
          t.identifier("S"),
          [],
          t.blockStatement([
            t.expressionStatement(
              t.callExpression(t.identifier("_LIB.render"), [
                _json(statementIndex)
              ])
            ),
            prev,
            ...statements
          ])
        ),
        t.returnStatement(
          t.jsxElement(
            t.jsxOpeningElement(
              t.jsxMemberExpression(
                t.jsxIdentifier("_LIB"),
                t.jsxIdentifier("Step")
              ),
              [
                t.jsxAttribute(
                  t.jsxIdentifier("step"),
                  t.jsxExpressionContainer(t.identifier("S"))
                )
              ],
              true
            ),
            null,
            []
          )
        )
      ];
    },
    []
  );

  block_path.replaceWith(
    t.blockStatement([
      t.expressionStatement(
        t.callExpression(t.identifier("_LIB.render"), [_json(componentName)])
      ),
      ...stmts
    ])
  );
}
