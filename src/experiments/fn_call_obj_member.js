function _app_original() {
  const obj = {
    a: 41,
    f: function(b) {
      return this.a + b;
    }
  };

  const result = obj.f(1);
  // TODO translate to: `obj.f.call(obj, 1);`

  const str = obj.toString();
  // TODO translate to: `obj.toString.call(obj);`

  console.log("result", result, str);
}

function* _app_transformed_manually() {
  const _CACHE = {};

  yield _stm("const obj = { ... };");
  const obj = yield _expr("{ ... }", {
    a: yield _expr("41", 41),
    f: function*(b) {
      yield _stm("return this.a + b;");
      return yield _expr(
        "this.a + b",
        (yield _expr("this.a", (yield _expr("this", this)).a)) +
          (yield _expr("b", b))
      );
    }
  });

  yield _stm("const result = obj.f(1);");
  const result = yield _expr(
    "obj.f(1)",
    yield* _lift(
      (yield _expr(
        "obj.f",
        (yield _expr("obj", (_CACHE["obj"] = obj))).f
      )).call(_CACHE["obj"], yield _expr("1", 1))
    )
  );

  yield _stm("const str = obj.toString();");
  const str = yield _expr(
    "obj.toString()",
    yield* _lift(
      (yield _expr(
        "obj.toString",
        (yield _expr("obj", (_CACHE["obj"] = obj))).toString
      )).call(_CACHE["obj"])
    )
  );

  yield "DONE";
  console.log("result", result, str);
}

function* _app_transformed_babel() {
  const _cache = {};

  yield _stm("VariableDeclaration");
  const obj = yield _expr("ObjectExpression", {
    a: yield _expr("NumericLiteral", 41),
    f: yield _expr("FunctionExpression", function*(b) {
      yield _stm("ReturnStatement");
      return yield _expr(
        "BinaryExpression",
        (yield _expr(
          "MemberExpression",
          (yield _expr("ThisExpression", this)).a
        )) + (yield _expr("Identifier", b))
      );
    })
  });
  yield _stm("VariableDeclaration");
  const result = yield _expr(
    "CallExpression",
    yield* _lift(
      (_cache[0] = yield _expr("Identifier", obj)).f.call(
        _cache[0],
        yield _expr("NumericLiteral", 1)
      )
    )
  );
  yield _stm("VariableDeclaration");
  const str = yield _expr(
    "CallExpression",
    yield* _lift(
      (_cache[1] = yield _expr("Identifier", obj)).toString.call(_cache[1])
    )
  );

  yield "DONE";
  console.log("result", result, str);
}

function _lift(r) {
  console.log("_lift", r);
  if (r && r[Symbol.iterator] && typeof r !== "string" && !Array.isArray(r)) {
    console.log("  ...already a stepper, so OK");
    return r;
  } else {
    console.log("  ...wrap into a stepper");
    return (function*() {
      return r;
    })();
  }
}

function _stm(info) {
  console.log("_stm", info);
}

function _expr(info, value) {
  console.log("_expr", info, "->", value);
  return value;
}

const a = _app_transformed_babel();
let v = {};

while (!v.done) {
  v = a.next(v.value);
}
