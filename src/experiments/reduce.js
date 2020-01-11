function _app_original() {
  const total = [45, 8, 12, 4].reduce((total, next) => {
    return total + next;
  }, 0);

  const long = ["Herman", "Roos", "Marie", "Jeroen", "Anne"].filter(name => {
    return name.length > 4;
  });

  console.log("DONE", total, long);
}

function* _app_transformed_babel() {
  const _cache = {};

  const _Array_find = Array.prototype.find;
  Array.prototype.find = function(callback) {
    return (callback instanceof function*() {}.constructor
      ? function*(callback) {
          console.log("!! using lifted version of Array::find");
          for (let i = 0; i < this.length; i++) {
            if (yield* callback(this[i], i, this)) {
              return this[i];
            }
          }
        }
      : _Array_find
    ).apply(this, arguments);
  };

  const _Array_findIndex = Array.prototype.findIndex;
  Array.prototype.findIndex = function(callback) {
    return (callback instanceof function*() {}.constructor
      ? function*(callback) {
          console.log("!! using lifted version of Array::findIndex");
          for (let i = 0; i < this.length; i++) {
            if (yield* callback(this[i], i, this)) {
              return i;
            }
          }
        }
      : _Array_findIndex
    ).apply(this, arguments);
  };

  const _Array_map = Array.prototype.map;
  Array.prototype.map = function(callback) {
    return (callback instanceof function*() {}.constructor
      ? function*(callback) {
          console.log("!! using lifted version of Array::map");
          const mapped = [];
          for (let i = 0; i < this.length; i++) {
            mapped[i] = yield* callback(this[i], i, this);
          }
          return mapped;
        }
      : _Array_map
    ).apply(this, arguments);
  };

  const _Array_forEach = Array.prototype.forEach;
  Array.prototype.forEach = function(callback) {
    return (callback instanceof function*() {}.constructor
      ? function*(callback) {
          console.log("!! using lifted version of Array::forEach");
          for (let i = 0; i < this.length; i++) {
            yield* callback(this[i], i, this);
          }
        }
      : _Array_forEach
    ).apply(this, arguments);
  };

  const _Array_filter = Array.prototype.filter;
  Array.prototype.filter = function(callback) {
    return (callback instanceof function*() {}.constructor
      ? function*(callback) {
          console.log("!! using lifted version of Array::filter");
          const filtered = [];
          for (let i = 0; i < this.length; i++) {
            if (yield* callback(this[i], i, this)) {
              filtered.push(this[i]);
            }
          }
          return filtered;
        }
      : _Array_filter
    ).apply(this, arguments);
  };

  const _Array_reduce = Array.prototype.reduce;
  Array.prototype.reduce = function(callback) {
    return (callback instanceof function*() {}.constructor
      ? function*(callback) {
          console.log("!! using lifted version of Array::reduce");
          const using_initial = arguments.length >= 2;
          let memo = using_initial ? arguments[1] : this[0];
          for (let i = using_initial ? 0 : 1; i < this.length; i++) {
            memo = yield* callback(memo, this[i], i, this);
          }
          return memo;
        }
      : _Array_reduce
    ).apply(this, arguments);
  };

  const _Array_flatMap = Array.prototype.flatMap;
  Array.prototype.flatMap = function(callback) {
    return (callback instanceof function*() {}.constructor
      ? function*(callback) {
          console.log("!! using lifted version of Array::flatMap");
          return this.map(callback).flat();
        }
      : _Array_flatMap
    ).apply(this, arguments);
  };

  // TODO:
  // Array::reduceRight
  // Array::some
  // Array::every
  // Array::sort

  yield _stm("VariableDeclaration");
  const total = yield _expr(
    "CallExpression",
    yield* _lift(
      (_cache[0] = yield _expr("ArrayExpression", [
        yield _expr("NumericLiteral", 45),
        yield _expr("NumericLiteral", 8),
        yield _expr("NumericLiteral", 12),
        yield _expr("NumericLiteral", 4)
      ])).reduce.call(
        _cache[0],
        function*(total, next) {
          yield _stm("ReturnStatement");
          return yield _expr(
            "BinaryExpression",
            (yield _expr("Identifier", total)) +
              (yield _expr("Identifier", next))
          );
        }.bind(this),
        yield _expr("NumericLiteral", 0)
      )
    )
  );
  yield _stm("VariableDeclaration");
  const long = yield _expr(
    "CallExpression",
    yield* _lift(
      (_cache[1] = yield _expr("ArrayExpression", [
        yield _expr("StringLiteral", "Herman"),
        yield _expr("StringLiteral", "Roos"),
        yield _expr("StringLiteral", "Marie"),
        yield _expr("StringLiteral", "Jeroen"),
        yield _expr("StringLiteral", "Anne")
      ])).filter.call(
        _cache[1],
        function*(name) {
          yield _stm("ReturnStatement");
          return yield _expr(
            "BinaryExpression",
            (yield _expr(
              "MemberExpression",
              (yield _expr("Identifier", name)).length
            )) > (yield _expr("NumericLiteral", 4))
          );
        }.bind(this)
      )
    )
  );

  yield "DONE";
  console.log(
    "DONE",
    total,
    long,
    [total, long].map(r => 10).reduce((a, b) => a + b),
    [10, 10].reduce((a, b) => a + b, 0)
  );
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
