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

function* _app_transformed() {
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
    yield* _wrap(
      (yield _expr(
        "obj.f",
        (yield _expr("obj", (_CACHE["obj"] = obj))).f
      )).call(_CACHE["obj"], yield _expr("1", 1))
    )
  );

  yield _stm("const str = obj.toString();");
  const str = yield _expr(
    "obj.toString()",
    yield* _wrap(
      (yield _expr(
        "obj.toString",
        (yield _expr("obj", (_CACHE["obj"] = obj))).toString
      )).call(_CACHE["obj"])
    )
  );

  yield "DONE";
  console.log("result", result, str);
}

function _wrap(r) {
  console.log("_wrap", r);
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

const a = _app_transformed();
let v = {};

while (!v.done) {
  v = a.next(v.value);
}
