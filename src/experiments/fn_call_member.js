function _app_original() {
  const arr = [];

  const res = arr.push(5);
  // TODO translate to: `arr.push.call(arr, 5);`

  console.log("result", res, arr);
}

function* _app_transformed() {
  const _CACHE = {};

  yield _stm("const arr = [];");
  const arr = yield _expr("[]", []);

  yield _stm("arr.push(5);");
  const res = yield _expr(
    "arr.push(5)",
    yield* _wrap(
      (yield _expr(
        "app.push",
        (yield _expr("arr", (_CACHE["arr"] = arr))).push
      )).call(_CACHE["arr"], yield _expr("5", 5))
    )
  );

  yield "DONE";
  console.log("result", res, arr);
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
