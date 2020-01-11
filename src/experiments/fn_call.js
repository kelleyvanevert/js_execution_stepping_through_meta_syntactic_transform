function _app_original() {
  function f(a, b) {
    return a + b;
  }

  const result = f(41, 1);

  console.log("result", result);
}

function* _app_transformed() {
  yield _stm("function* f(a, b) { ... }");
  function* f(a, b) {
    return yield _expr("a+b", (yield _expr("a", a)) + (yield _expr("b", b)));
  }

  yield _stm("const result = f(41, 1);");
  const result = yield _expr(
    "f(41, 1)",
    yield* _wrap(
      (yield _expr("f", f)).call(
        undefined,
        yield _expr("41", 41),
        yield _expr("1", 1)
      )
    )
  );

  yield "DONE";
  console.log("result", result);
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
