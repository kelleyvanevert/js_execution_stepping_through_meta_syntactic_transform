import "@babel/register";
import "@babel/preset-stage-1";
import "@babel/preset-react";
import "@babel/plugin-syntax-jsx";
import "@babel/preset-env-standalone";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";

import StepperizePlugin from "./babel_plugin";

const { visitor } = StepperizePlugin({ types: t });

export default function gen(code) {
  const ast = parse(code, {
    sourceType: "module",
    plugins: [
      // "jsx"
    ]
  });

  traverse(ast, visitor);

  const generated = generate(ast, {
    presets: [
      // "react"
    ]
  });

  return generated.code;
}

export const TEMPLATE = `
function* _app() {
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

  GENERATED_CODE;

  return;
}
_app;
`;
