"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/csv-parser/index.js
var require_csv_parser = __commonJS({
  "node_modules/csv-parser/index.js"(exports2, module2) {
    var { Transform } = require("stream");
    var [cr] = Buffer.from("\r");
    var [nl] = Buffer.from("\n");
    var defaults = {
      escape: '"',
      headers: null,
      mapHeaders: ({ header: header2 }) => header2,
      mapValues: ({ value }) => value,
      newline: "\n",
      quote: '"',
      raw: false,
      separator: ",",
      skipComments: false,
      skipLines: null,
      maxRowBytes: Number.MAX_SAFE_INTEGER,
      strict: false,
      outputByteOffset: false
    };
    var DANGEROUS_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
    function sanitizeHeader(header2) {
      if (typeof header2 !== "string") {
        return null;
      }
      if (DANGEROUS_KEYS.has(header2)) {
        return null;
      }
      return header2;
    }
    var CsvParser = class extends Transform {
      constructor(opts = {}) {
        super({ objectMode: true, highWaterMark: 16 });
        if (Array.isArray(opts)) opts = { headers: opts };
        const options = Object.assign({}, defaults, opts);
        options.customNewline = options.newline !== defaults.newline;
        for (const key of ["newline", "quote", "separator"]) {
          if (typeof options[key] !== "undefined") {
            [options[key]] = Buffer.from(options[key]);
          }
        }
        options.escape = (opts || {}).escape ? Buffer.from(options.escape)[0] : options.quote;
        this.state = {
          empty: options.raw ? Buffer.alloc(0) : "",
          escaped: false,
          first: true,
          lineNumber: 0,
          previousEnd: 0,
          rowLength: 0,
          quoted: false
        };
        this._prev = null;
        if (options.headers === false) {
          options.strict = false;
        }
        if (options.headers || options.headers === false) {
          this.state.first = false;
        }
        this.options = options;
        this.headers = options.headers;
        this.bytesRead = 0;
      }
      parseCell(buffer, start, end) {
        const { escape, quote } = this.options;
        if (buffer[start] === quote && buffer[end - 1] === quote) {
          start++;
          end--;
        }
        let y = start;
        for (let i = start; i < end; i++) {
          if (buffer[i] === escape && i + 1 < end && buffer[i + 1] === quote) {
            i++;
          }
          if (y !== i) {
            buffer[y] = buffer[i];
          }
          y++;
        }
        return this.parseValue(buffer, start, y);
      }
      parseLine(buffer, start, end) {
        const { customNewline, escape, mapHeaders, mapValues, quote, separator: separator2, skipComments, skipLines } = this.options;
        end--;
        if (!customNewline && buffer.length && buffer[end - 1] === cr) {
          end--;
        }
        const comma = separator2;
        const cells = [];
        let isQuoted = false;
        let offset = start;
        if (skipComments) {
          const char = typeof skipComments === "string" ? skipComments : "#";
          if (buffer[start] === Buffer.from(char)[0]) {
            return;
          }
        }
        const mapValue = (value) => {
          if (this.state.first) {
            return value;
          }
          const index = cells.length;
          const header2 = this.headers[index];
          return mapValues({ header: header2, index, value });
        };
        for (let i = start; i < end; i++) {
          const isStartingQuote = !isQuoted && buffer[i] === quote;
          const isEndingQuote = isQuoted && buffer[i] === quote && i + 1 <= end && buffer[i + 1] === comma;
          const isEscape = isQuoted && buffer[i] === escape && i + 1 < end && buffer[i + 1] === quote;
          if (isStartingQuote || isEndingQuote) {
            isQuoted = !isQuoted;
            continue;
          } else if (isEscape) {
            i++;
            continue;
          }
          if (buffer[i] === comma && !isQuoted) {
            let value = this.parseCell(buffer, offset, i);
            value = mapValue(value);
            cells.push(value);
            offset = i + 1;
          }
        }
        if (offset < end) {
          let value = this.parseCell(buffer, offset, end);
          value = mapValue(value);
          cells.push(value);
        }
        if (buffer[end - 1] === comma) {
          cells.push(mapValue(this.state.empty));
        }
        const skip = skipLines && skipLines > this.state.lineNumber;
        this.state.lineNumber++;
        if (this.state.first && !skip) {
          this.state.first = false;
          this.headers = cells.map((header2, index) => {
            const mapped = mapHeaders({ header: header2, index });
            if (mapped === null) {
              return null;
            }
            return sanitizeHeader(mapped);
          });
          this.emit("headers", this.headers);
          return;
        }
        if (!skip && this.options.strict && cells.length !== this.headers.length) {
          const e = new RangeError("Row length does not match headers");
          this.emit("error", e);
        } else {
          if (!skip) {
            const byteOffset = this.bytesRead - buffer.length + start;
            this.writeRow(cells, byteOffset);
          }
        }
      }
      parseValue(buffer, start, end) {
        if (this.options.raw) {
          return buffer.slice(start, end);
        }
        return buffer.toString("utf-8", start, end);
      }
      writeRow(cells, byteOffset) {
        const headers = this.headers === false ? cells.map((value, index) => index) : this.headers;
        const row = cells.reduce((o, cell, index) => {
          const header2 = headers[index];
          if (header2 === null) return o;
          if (header2 !== void 0) {
            o[header2] = cell;
          } else {
            o[`_${index}`] = cell;
          }
          return o;
        }, {});
        if (this.options.outputByteOffset) {
          this.push({ row, byteOffset });
        } else {
          this.push(row);
        }
      }
      _flush(cb) {
        if (this.state.escaped || !this._prev) return cb();
        this.parseLine(this._prev, this.state.previousEnd, this._prev.length + 1);
        cb();
      }
      _transform(data, enc, cb) {
        if (typeof data === "string") {
          data = Buffer.from(data);
        }
        const { escape, quote } = this.options;
        let start = 0;
        let buffer = data;
        this.bytesRead += data.byteLength;
        if (this._prev) {
          start = this._prev.length;
          buffer = Buffer.concat([this._prev, data]);
          this._prev = null;
        }
        const bufferLength = buffer.length;
        for (let i = start; i < bufferLength; i++) {
          const chr = buffer[i];
          const nextChr = i + 1 < bufferLength ? buffer[i + 1] : null;
          this.state.rowLength++;
          if (this.state.rowLength > this.options.maxRowBytes) {
            return cb(new Error("Row exceeds the maximum size"));
          }
          if (!this.state.escaped && chr === escape && nextChr === quote && i !== start) {
            this.state.escaped = true;
            continue;
          } else if (chr === quote) {
            if (this.state.escaped) {
              this.state.escaped = false;
            } else {
              this.state.quoted = !this.state.quoted;
            }
            continue;
          }
          if (!this.state.quoted) {
            if (this.state.first && !this.options.customNewline) {
              if (chr === nl) {
                this.options.newline = nl;
              } else if (chr === cr) {
                if (nextChr !== nl) {
                  this.options.newline = cr;
                }
              }
            }
            if (chr === this.options.newline) {
              this.parseLine(buffer, this.state.previousEnd, i + 1);
              this.state.previousEnd = i + 1;
              this.state.rowLength = 0;
            }
          }
        }
        if (this.state.previousEnd === bufferLength) {
          this.state.previousEnd = 0;
          return cb();
        }
        if (bufferLength - this.state.previousEnd < data.length) {
          this._prev = data;
          this.state.previousEnd -= bufferLength - data.length;
          return cb();
        }
        this._prev = buffer;
        cb();
      }
    };
    module2.exports = (opts) => new CsvParser(opts);
  }
});

// node_modules/JSONPath/lib/jsonpath.js
var require_jsonpath = __commonJS({
  "node_modules/JSONPath/lib/jsonpath.js"(exports, module) {
    (function(require) {
      "use strict";
      if (!Array.isArray) {
        Array.isArray = function(vArg) {
          return Object.prototype.toString.call(vArg) === "[object Array]";
        };
      }
      var isNode = typeof module !== "undefined" && !!module.exports;
      var allowedResultTypes = ["value", "path", "parent", "parentProperty", "all"];
      var vm = isNode ? require("vm") : {
        runInNewContext: function(expr, context) {
          return eval(Object.keys(context).reduce(function(s, vr) {
            return "var " + vr + "=" + JSON.stringify(context[vr]).replace(/\u2028|\u2029/g, function(m) {
              return "\\u202" + (m === "\u2028" ? "8" : "9");
            }) + ";" + s;
          }, expr));
        }
      };
      function push(arr, elem) {
        arr = arr.slice();
        arr.push(elem);
        return arr;
      }
      function unshift(elem, arr) {
        arr = arr.slice();
        arr.unshift(elem);
        return arr;
      }
      function JSONPath(opts, expr2, obj, callback) {
        if (!(this instanceof JSONPath)) {
          try {
            return new JSONPath(opts, expr2, obj, callback);
          } catch (e) {
            if (!e.avoidNew) {
              throw e;
            }
            return e.value;
          }
        }
        opts = opts || {};
        var objArgs = opts.hasOwnProperty("json") && opts.hasOwnProperty("path");
        this.json = opts.json || obj;
        this.path = opts.path || expr2;
        this.resultType = opts.resultType && opts.resultType.toLowerCase() || "value";
        this.flatten = opts.flatten || false;
        this.wrap = opts.hasOwnProperty("wrap") ? opts.wrap : true;
        this.sandbox = opts.sandbox || {};
        this.preventEval = opts.preventEval || false;
        this.parent = opts.parent || null;
        this.parentProperty = opts.parentProperty || null;
        this.callback = opts.callback || null;
        this.otherTypeCallback = opts.otherTypeCallback || function() {
          throw "You must supply an otherTypeCallback callback option with the @other() operator.";
        };
        if (opts.autostart !== false) {
          var ret = this.evaluate({
            path: objArgs ? opts.path : expr2,
            json: objArgs ? opts.json : obj
          });
          if (!ret || typeof ret !== "object") {
            throw { avoidNew: true, value: ret, message: "JSONPath should not be called with 'new' (it prevents return of (unwrapped) scalar values)" };
          }
          return ret;
        }
      }
      JSONPath.prototype.evaluate = function(expr2, json, callback, otherTypeCallback) {
        var self3 = this, flatten = this.flatten, wrap = this.wrap, currParent = this.parent, currParentProperty = this.parentProperty;
        this.currResultType = this.resultType;
        this.currPreventEval = this.preventEval;
        this.currSandbox = this.sandbox;
        callback = callback || this.callback;
        this.currOtherTypeCallback = otherTypeCallback || this.otherTypeCallback;
        json = json || this.json;
        expr2 = expr2 || this.path;
        if (expr2 && typeof expr2 === "object") {
          if (!expr2.path) {
            throw "You must supply a 'path' property when providing an object argument to JSONPath.evaluate().";
          }
          json = expr2.hasOwnProperty("json") ? expr2.json : json;
          flatten = expr2.hasOwnProperty("flatten") ? expr2.flatten : flatten;
          this.currResultType = expr2.hasOwnProperty("resultType") ? expr2.resultType : this.currResultType;
          this.currSandbox = expr2.hasOwnProperty("sandbox") ? expr2.sandbox : this.currSandbox;
          wrap = expr2.hasOwnProperty("wrap") ? expr2.wrap : wrap;
          this.currPreventEval = expr2.hasOwnProperty("preventEval") ? expr2.preventEval : this.currPreventEval;
          callback = expr2.hasOwnProperty("callback") ? expr2.callback : callback;
          this.currOtherTypeCallback = expr2.hasOwnProperty("otherTypeCallback") ? expr2.otherTypeCallback : this.currOtherTypeCallback;
          currParent = expr2.hasOwnProperty("parent") ? expr2.parent : currParent;
          currParentProperty = expr2.hasOwnProperty("parentProperty") ? expr2.parentProperty : currParentProperty;
          expr2 = expr2.path;
        }
        currParent = currParent || null;
        currParentProperty = currParentProperty || null;
        if (Array.isArray(expr2)) {
          expr2 = JSONPath.toPathString(expr2);
        }
        if (!expr2 || !json || allowedResultTypes.indexOf(this.currResultType) === -1) {
          return;
        }
        this._obj = json;
        var exprList = JSONPath.toPathArray(expr2);
        if (exprList[0] === "$" && exprList.length > 1) {
          exprList.shift();
        }
        var result = this._trace(exprList, json, ["$"], currParent, currParentProperty, callback);
        result = result.filter(function(ea) {
          return ea && !ea.isParentSelector;
        });
        if (!result.length) {
          return wrap ? [] : void 0;
        }
        if (result.length === 1 && !wrap && !Array.isArray(result[0].value)) {
          return this._getPreferredOutput(result[0]);
        }
        return result.reduce(function(result2, ea) {
          var valOrPath = self3._getPreferredOutput(ea);
          if (flatten && Array.isArray(valOrPath)) {
            result2 = result2.concat(valOrPath);
          } else {
            result2.push(valOrPath);
          }
          return result2;
        }, []);
      };
      JSONPath.prototype._getPreferredOutput = function(ea) {
        var resultType = this.currResultType;
        switch (resultType) {
          case "all":
            ea.path = JSONPath.toPathString(ea.path);
            return ea;
          case "value":
          case "parent":
          case "parentProperty":
            return ea[resultType];
          case "path":
            return JSONPath.toPathString(ea[resultType]);
        }
      };
      JSONPath.prototype._handleCallback = function(fullRetObj, callback, type) {
        if (callback) {
          var preferredOutput = this._getPreferredOutput(fullRetObj);
          fullRetObj.path = JSONPath.toPathString(fullRetObj.path);
          callback(preferredOutput, type, fullRetObj);
        }
      };
      JSONPath.prototype._trace = function(expr2, val, path2, parent, parentPropName, callback) {
        var retObj, self3 = this;
        if (!expr2.length) {
          retObj = { path: path2, value: val, parent, parentProperty: parentPropName };
          this._handleCallback(retObj, callback, "value");
          return retObj;
        }
        var loc = expr2[0], x = expr2.slice(1);
        var ret = [];
        function addRet(elems) {
          ret = ret.concat(elems);
        }
        if (val && val.hasOwnProperty(loc)) {
          addRet(this._trace(x, val[loc], push(path2, loc), val, loc, callback));
        } else if (loc === "*") {
          this._walk(loc, x, val, path2, parent, parentPropName, callback, function(m, l, x2, v, p, par, pr, cb) {
            addRet(self3._trace(unshift(m, x2), v, p, par, pr, cb));
          });
        } else if (loc === "..") {
          addRet(this._trace(x, val, path2, parent, parentPropName, callback));
          this._walk(loc, x, val, path2, parent, parentPropName, callback, function(m, l, x2, v, p, par, pr, cb) {
            if (typeof v[m] === "object") {
              addRet(self3._trace(unshift(l, x2), v[m], push(p, m), v, m, cb));
            }
          });
        } else if (loc[0] === "(") {
          if (this.currPreventEval) {
            throw "Eval [(expr)] prevented in JSONPath expression.";
          }
          addRet(this._trace(unshift(this._eval(loc, val, path2[path2.length - 1], path2.slice(0, -1), parent, parentPropName), x), val, path2, parent, parentPropName, callback));
        } else if (loc === "^") {
          return path2.length ? {
            path: path2.slice(0, -1),
            expr: x,
            isParentSelector: true
          } : [];
        } else if (loc === "~") {
          retObj = { path: push(path2, loc), value: parentPropName, parent, parentProperty: null };
          this._handleCallback(retObj, callback, "property");
          return retObj;
        } else if (loc === "$") {
          addRet(this._trace(x, val, path2, null, null, callback));
        } else if (loc.indexOf("?(") === 0) {
          if (this.currPreventEval) {
            throw "Eval [?(expr)] prevented in JSONPath expression.";
          }
          this._walk(loc, x, val, path2, parent, parentPropName, callback, function(m, l, x2, v, p, par, pr, cb) {
            if (self3._eval(l.replace(/^\?\((.*?)\)$/, "$1"), v[m], m, p, par, pr)) {
              addRet(self3._trace(unshift(m, x2), v, p, par, pr, cb));
            }
          });
        } else if (loc.indexOf(",") > -1) {
          var parts, i;
          for (parts = loc.split(","), i = 0; i < parts.length; i++) {
            addRet(this._trace(unshift(parts[i], x), val, path2, parent, parentPropName, callback));
          }
        } else if (loc[0] === "@") {
          var addType = false;
          var valueType = loc.slice(1, -2);
          switch (valueType) {
            case "boolean":
            case "string":
            case "undefined":
            case "function":
              if (typeof val === valueType) {
                addType = true;
              }
              break;
            case "number":
              if (typeof val === valueType && isFinite(val)) {
                addType = true;
              }
              break;
            case "nonFinite":
              if (typeof val === "number" && !isFinite(val)) {
                addType = true;
              }
              break;
            case "object":
              if (val && typeof val === valueType) {
                addType = true;
              }
              break;
            case "array":
              if (Array.isArray(val)) {
                addType = true;
              }
              break;
            case "other":
              addType = this.currOtherTypeCallback(val, path2, parent, parentPropName);
              break;
            case "integer":
              if (val === +val && isFinite(val) && !(val % 1)) {
                addType = true;
              }
              break;
            case "null":
              if (val === null) {
                addType = true;
              }
              break;
          }
          if (addType) {
            retObj = { path: path2, value: val, parent, parentProperty: parentPropName };
            this._handleCallback(retObj, callback, "value");
            return retObj;
          }
        } else if (/^(-?[0-9]*):(-?[0-9]*):?([0-9]*)$/.test(loc)) {
          addRet(this._slice(loc, x, val, path2, parent, parentPropName, callback));
        }
        return ret.reduce(function(all, ea) {
          return all.concat(ea.isParentSelector ? self3._trace(ea.expr, val, ea.path, parent, parentPropName, callback) : ea);
        }, []);
      };
      JSONPath.prototype._walk = function(loc, expr2, val, path2, parent, parentPropName, callback, f) {
        var i, n, m;
        if (Array.isArray(val)) {
          for (i = 0, n = val.length; i < n; i++) {
            f(i, loc, expr2, val, path2, parent, parentPropName, callback);
          }
        } else if (typeof val === "object") {
          for (m in val) {
            if (val.hasOwnProperty(m)) {
              f(m, loc, expr2, val, path2, parent, parentPropName, callback);
            }
          }
        }
      };
      JSONPath.prototype._slice = function(loc, expr2, val, path2, parent, parentPropName, callback) {
        if (!Array.isArray(val)) {
          return;
        }
        var i, len = val.length, parts = loc.split(":"), start = parts[0] && parseInt(parts[0], 10) || 0, end = parts[1] && parseInt(parts[1], 10) || len, step = parts[2] && parseInt(parts[2], 10) || 1;
        start = start < 0 ? Math.max(0, start + len) : Math.min(len, start);
        end = end < 0 ? Math.max(0, end + len) : Math.min(len, end);
        var ret = [];
        for (i = start; i < end; i += step) {
          ret = ret.concat(this._trace(unshift(i, expr2), val, path2, parent, parentPropName, callback));
        }
        return ret;
      };
      JSONPath.prototype._eval = function(code, _v, _vname, path2, parent, parentPropName) {
        if (!this._obj || !_v) {
          return false;
        }
        if (code.indexOf("@parentProperty") > -1) {
          this.currSandbox._$_parentProperty = parentPropName;
          code = code.replace(/@parentProperty/g, "_$_parentProperty");
        }
        if (code.indexOf("@parent") > -1) {
          this.currSandbox._$_parent = parent;
          code = code.replace(/@parent/g, "_$_parent");
        }
        if (code.indexOf("@property") > -1) {
          this.currSandbox._$_property = _vname;
          code = code.replace(/@property/g, "_$_property");
        }
        if (code.indexOf("@path") > -1) {
          this.currSandbox._$_path = JSONPath.toPathString(path2.concat([_vname]));
          code = code.replace(/@path/g, "_$_path");
        }
        if (code.indexOf("@") > -1) {
          this.currSandbox._$_v = _v;
          code = code.replace(/@/g, "_$_v");
        }
        try {
          return vm.runInNewContext(code, this.currSandbox);
        } catch (e) {
          console.log(e);
          throw new Error("jsonPath: " + e.message + ": " + code);
        }
      };
      JSONPath.cache = {};
      JSONPath.toPathString = function(pathArr) {
        var i, n, x = pathArr, p = "$";
        for (i = 1, n = x.length; i < n; i++) {
          p += /~|@.*\(\)/.test(x[i]) ? x[i] : /^[0-9*]+$/.test(x[i]) ? "[" + x[i] + "]" : "['" + x[i] + "']";
        }
        return p;
      };
      JSONPath.toPathArray = function(expr2) {
        var cache = JSONPath.cache;
        if (cache[expr2]) {
          return cache[expr2];
        }
        var subx = [];
        var normalized = expr2.replace(/@(?:null|boolean|number|string|array|object|integer|undefined|nonFinite|function|other)\(\)/g, ";$&;").replace(/~/g, ";~;").replace(/[\['](\??\(.*?\))[\]']/g, function($0, $1) {
          return "[#" + (subx.push($1) - 1) + "]";
        }).replace(/\['([^'\]]*)'\]/g, function($0, prop) {
          return "['" + prop.replace(/\./g, "%@%") + "']";
        }).replace(/'?\.'?(?![^\[]*\])|\['?/g, ";").replace(/%@%/g, ".").replace(/(?:;)?(\^+)(?:;)?/g, function($0, ups) {
          return ";" + ups.split("").join(";") + ";";
        }).replace(/;;;|;;/g, ";..;").replace(/;$|'?\]|'$/g, "");
        var exprList = normalized.split(";").map(function(expr3) {
          var match = expr3.match(/#([0-9]+)/);
          return !match || !match[1] ? expr3 : subx[match[1]];
        });
        cache[expr2] = exprList;
        return cache[expr2];
      };
      JSONPath.eval = function(obj, expr2, opts) {
        return JSONPath(opts, expr2, obj);
      };
      if (typeof define === "function" && define.amd) {
        define(function() {
          return JSONPath;
        });
      } else if (typeof module === "undefined") {
        self.jsonPath = {
          // Deprecated
          eval: JSONPath.eval
        };
        self.JSONPath = JSONPath;
      } else {
        module.exports = JSONPath;
      }
    })(typeof require === "undefined" ? null : require);
  }
});

// node_modules/colors/lib/styles.js
var require_styles = __commonJS({
  "node_modules/colors/lib/styles.js"(exports2, module2) {
    var styles = {};
    module2["exports"] = styles;
    var codes = {
      reset: [0, 0],
      bold: [1, 22],
      dim: [2, 22],
      italic: [3, 23],
      underline: [4, 24],
      inverse: [7, 27],
      hidden: [8, 28],
      strikethrough: [9, 29],
      black: [30, 39],
      red: [31, 39],
      green: [32, 39],
      yellow: [33, 39],
      blue: [34, 39],
      magenta: [35, 39],
      cyan: [36, 39],
      white: [37, 39],
      gray: [90, 39],
      grey: [90, 39],
      bgBlack: [40, 49],
      bgRed: [41, 49],
      bgGreen: [42, 49],
      bgYellow: [43, 49],
      bgBlue: [44, 49],
      bgMagenta: [45, 49],
      bgCyan: [46, 49],
      bgWhite: [47, 49],
      // legacy styles for colors pre v1.0.0
      blackBG: [40, 49],
      redBG: [41, 49],
      greenBG: [42, 49],
      yellowBG: [43, 49],
      blueBG: [44, 49],
      magentaBG: [45, 49],
      cyanBG: [46, 49],
      whiteBG: [47, 49]
    };
    Object.keys(codes).forEach(function(key) {
      var val = codes[key];
      var style = styles[key] = [];
      style.open = "\x1B[" + val[0] + "m";
      style.close = "\x1B[" + val[1] + "m";
    });
  }
});

// node_modules/colors/lib/system/supports-colors.js
var require_supports_colors = __commonJS({
  "node_modules/colors/lib/system/supports-colors.js"(exports2, module2) {
    var argv = process.argv;
    module2.exports = (function() {
      if (argv.indexOf("--no-color") !== -1 || argv.indexOf("--color=false") !== -1) {
        return false;
      }
      if (argv.indexOf("--color") !== -1 || argv.indexOf("--color=true") !== -1 || argv.indexOf("--color=always") !== -1) {
        return true;
      }
      if (process.stdout && !process.stdout.isTTY) {
        return false;
      }
      if (process.platform === "win32") {
        return true;
      }
      if ("COLORTERM" in process.env) {
        return true;
      }
      if (process.env.TERM === "dumb") {
        return false;
      }
      if (/^screen|^xterm|^vt100|color|ansi|cygwin|linux/i.test(process.env.TERM)) {
        return true;
      }
      return false;
    })();
  }
});

// node_modules/colors/lib/custom/trap.js
var require_trap = __commonJS({
  "node_modules/colors/lib/custom/trap.js"(exports2, module2) {
    module2["exports"] = function runTheTrap(text, options) {
      var result = "";
      text = text || "Run the trap, drop the bass";
      text = text.split("");
      var trap = {
        a: ["@", "\u0104", "\u023A", "\u0245", "\u0394", "\u039B", "\u0414"],
        b: ["\xDF", "\u0181", "\u0243", "\u026E", "\u03B2", "\u0E3F"],
        c: ["\xA9", "\u023B", "\u03FE"],
        d: ["\xD0", "\u018A", "\u0500", "\u0501", "\u0502", "\u0503"],
        e: ["\xCB", "\u0115", "\u018E", "\u0258", "\u03A3", "\u03BE", "\u04BC", "\u0A6C"],
        f: ["\u04FA"],
        g: ["\u0262"],
        h: ["\u0126", "\u0195", "\u04A2", "\u04BA", "\u04C7", "\u050A"],
        i: ["\u0F0F"],
        j: ["\u0134"],
        k: ["\u0138", "\u04A0", "\u04C3", "\u051E"],
        l: ["\u0139"],
        m: ["\u028D", "\u04CD", "\u04CE", "\u0520", "\u0521", "\u0D69"],
        n: ["\xD1", "\u014B", "\u019D", "\u0376", "\u03A0", "\u048A"],
        o: ["\xD8", "\xF5", "\xF8", "\u01FE", "\u0298", "\u047A", "\u05DD", "\u06DD", "\u0E4F"],
        p: ["\u01F7", "\u048E"],
        q: ["\u09CD"],
        r: ["\xAE", "\u01A6", "\u0210", "\u024C", "\u0280", "\u042F"],
        s: ["\xA7", "\u03DE", "\u03DF", "\u03E8"],
        t: ["\u0141", "\u0166", "\u0373"],
        u: ["\u01B1", "\u054D"],
        v: ["\u05D8"],
        w: ["\u0428", "\u0460", "\u047C", "\u0D70"],
        x: ["\u04B2", "\u04FE", "\u04FC", "\u04FD"],
        y: ["\xA5", "\u04B0", "\u04CB"],
        z: ["\u01B5", "\u0240"]
      };
      text.forEach(function(c) {
        c = c.toLowerCase();
        var chars = trap[c] || [" "];
        var rand = Math.floor(Math.random() * chars.length);
        if (typeof trap[c] !== "undefined") {
          result += trap[c][rand];
        } else {
          result += c;
        }
      });
      return result;
    };
  }
});

// node_modules/colors/lib/custom/zalgo.js
var require_zalgo = __commonJS({
  "node_modules/colors/lib/custom/zalgo.js"(exports2, module2) {
    module2["exports"] = function zalgo(text, options) {
      text = text || "   he is here   ";
      var soul = {
        "up": [
          "\u030D",
          "\u030E",
          "\u0304",
          "\u0305",
          "\u033F",
          "\u0311",
          "\u0306",
          "\u0310",
          "\u0352",
          "\u0357",
          "\u0351",
          "\u0307",
          "\u0308",
          "\u030A",
          "\u0342",
          "\u0313",
          "\u0308",
          "\u034A",
          "\u034B",
          "\u034C",
          "\u0303",
          "\u0302",
          "\u030C",
          "\u0350",
          "\u0300",
          "\u0301",
          "\u030B",
          "\u030F",
          "\u0312",
          "\u0313",
          "\u0314",
          "\u033D",
          "\u0309",
          "\u0363",
          "\u0364",
          "\u0365",
          "\u0366",
          "\u0367",
          "\u0368",
          "\u0369",
          "\u036A",
          "\u036B",
          "\u036C",
          "\u036D",
          "\u036E",
          "\u036F",
          "\u033E",
          "\u035B",
          "\u0346",
          "\u031A"
        ],
        "down": [
          "\u0316",
          "\u0317",
          "\u0318",
          "\u0319",
          "\u031C",
          "\u031D",
          "\u031E",
          "\u031F",
          "\u0320",
          "\u0324",
          "\u0325",
          "\u0326",
          "\u0329",
          "\u032A",
          "\u032B",
          "\u032C",
          "\u032D",
          "\u032E",
          "\u032F",
          "\u0330",
          "\u0331",
          "\u0332",
          "\u0333",
          "\u0339",
          "\u033A",
          "\u033B",
          "\u033C",
          "\u0345",
          "\u0347",
          "\u0348",
          "\u0349",
          "\u034D",
          "\u034E",
          "\u0353",
          "\u0354",
          "\u0355",
          "\u0356",
          "\u0359",
          "\u035A",
          "\u0323"
        ],
        "mid": [
          "\u0315",
          "\u031B",
          "\u0300",
          "\u0301",
          "\u0358",
          "\u0321",
          "\u0322",
          "\u0327",
          "\u0328",
          "\u0334",
          "\u0335",
          "\u0336",
          "\u035C",
          "\u035D",
          "\u035E",
          "\u035F",
          "\u0360",
          "\u0362",
          "\u0338",
          "\u0337",
          "\u0361",
          " \u0489"
        ]
      }, all = [].concat(soul.up, soul.down, soul.mid), zalgo2 = {};
      function randomNumber(range) {
        var r = Math.floor(Math.random() * range);
        return r;
      }
      function is_char(character) {
        var bool = false;
        all.filter(function(i) {
          bool = i === character;
        });
        return bool;
      }
      function heComes(text2, options2) {
        var result = "", counts, l;
        options2 = options2 || {};
        options2["up"] = options2["up"] || true;
        options2["mid"] = options2["mid"] || true;
        options2["down"] = options2["down"] || true;
        options2["size"] = options2["size"] || "maxi";
        text2 = text2.split("");
        for (l in text2) {
          if (is_char(l)) {
            continue;
          }
          result = result + text2[l];
          counts = { "up": 0, "down": 0, "mid": 0 };
          switch (options2.size) {
            case "mini":
              counts.up = randomNumber(8);
              counts.min = randomNumber(2);
              counts.down = randomNumber(8);
              break;
            case "maxi":
              counts.up = randomNumber(16) + 3;
              counts.min = randomNumber(4) + 1;
              counts.down = randomNumber(64) + 3;
              break;
            default:
              counts.up = randomNumber(8) + 1;
              counts.mid = randomNumber(6) / 2;
              counts.down = randomNumber(8) + 1;
              break;
          }
          var arr = ["up", "mid", "down"];
          for (var d in arr) {
            var index = arr[d];
            for (var i = 0; i <= counts[index]; i++) {
              if (options2[index]) {
                result = result + soul[index][randomNumber(soul[index].length)];
              }
            }
          }
        }
        return result;
      }
      return heComes(text);
    };
  }
});

// node_modules/colors/lib/maps/america.js
var require_america = __commonJS({
  "node_modules/colors/lib/maps/america.js"(exports2, module2) {
    var colors = require_colors();
    module2["exports"] = /* @__PURE__ */ (function() {
      return function(letter, i, exploded) {
        if (letter === " ") return letter;
        switch (i % 3) {
          case 0:
            return colors.red(letter);
          case 1:
            return colors.white(letter);
          case 2:
            return colors.blue(letter);
        }
      };
    })();
  }
});

// node_modules/colors/lib/maps/zebra.js
var require_zebra = __commonJS({
  "node_modules/colors/lib/maps/zebra.js"(exports2, module2) {
    var colors = require_colors();
    module2["exports"] = function(letter, i, exploded) {
      return i % 2 === 0 ? letter : colors.inverse(letter);
    };
  }
});

// node_modules/colors/lib/maps/rainbow.js
var require_rainbow = __commonJS({
  "node_modules/colors/lib/maps/rainbow.js"(exports2, module2) {
    var colors = require_colors();
    module2["exports"] = /* @__PURE__ */ (function() {
      var rainbowColors = ["red", "yellow", "green", "blue", "magenta"];
      return function(letter, i, exploded) {
        if (letter === " ") {
          return letter;
        } else {
          return colors[rainbowColors[i++ % rainbowColors.length]](letter);
        }
      };
    })();
  }
});

// node_modules/colors/lib/maps/random.js
var require_random = __commonJS({
  "node_modules/colors/lib/maps/random.js"(exports2, module2) {
    var colors = require_colors();
    module2["exports"] = /* @__PURE__ */ (function() {
      var available = ["underline", "inverse", "grey", "yellow", "red", "green", "blue", "white", "cyan", "magenta"];
      return function(letter, i, exploded) {
        return letter === " " ? letter : colors[available[Math.round(Math.random() * (available.length - 1))]](letter);
      };
    })();
  }
});

// node_modules/colors/lib/colors.js
var require_colors = __commonJS({
  "node_modules/colors/lib/colors.js"(exports2, module2) {
    var colors = {};
    module2["exports"] = colors;
    colors.themes = {};
    var ansiStyles = colors.styles = require_styles();
    var defineProps = Object.defineProperties;
    colors.supportsColor = require_supports_colors();
    if (typeof colors.enabled === "undefined") {
      colors.enabled = colors.supportsColor;
    }
    colors.stripColors = colors.strip = function(str) {
      return ("" + str).replace(/\x1B\[\d+m/g, "");
    };
    var stylize = colors.stylize = function stylize2(str, style) {
      return ansiStyles[style].open + str + ansiStyles[style].close;
    };
    var matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;
    var escapeStringRegexp = function(str) {
      if (typeof str !== "string") {
        throw new TypeError("Expected a string");
      }
      return str.replace(matchOperatorsRe, "\\$&");
    };
    function build(_styles) {
      var builder = function builder2() {
        return applyStyle.apply(builder2, arguments);
      };
      builder._styles = _styles;
      builder.__proto__ = proto;
      return builder;
    }
    var styles = (function() {
      var ret = {};
      ansiStyles.grey = ansiStyles.gray;
      Object.keys(ansiStyles).forEach(function(key) {
        ansiStyles[key].closeRe = new RegExp(escapeStringRegexp(ansiStyles[key].close), "g");
        ret[key] = {
          get: function() {
            return build(this._styles.concat(key));
          }
        };
      });
      return ret;
    })();
    var proto = defineProps(function colors2() {
    }, styles);
    function applyStyle() {
      var args = arguments;
      var argsLen = args.length;
      var str = argsLen !== 0 && String(arguments[0]);
      if (argsLen > 1) {
        for (var a = 1; a < argsLen; a++) {
          str += " " + args[a];
        }
      }
      if (!colors.enabled || !str) {
        return str;
      }
      var nestedStyles = this._styles;
      var i = nestedStyles.length;
      while (i--) {
        var code = ansiStyles[nestedStyles[i]];
        str = code.open + str.replace(code.closeRe, code.open) + code.close;
      }
      return str;
    }
    function applyTheme(theme) {
      for (var style in theme) {
        (function(style2) {
          colors[style2] = function(str) {
            return colors[theme[style2]](str);
          };
        })(style);
      }
    }
    colors.setTheme = function(theme) {
      if (typeof theme === "string") {
        try {
          colors.themes[theme] = require(theme);
          applyTheme(colors.themes[theme]);
          return colors.themes[theme];
        } catch (err) {
          console.log(err);
          return err;
        }
      } else {
        applyTheme(theme);
      }
    };
    function init() {
      var ret = {};
      Object.keys(styles).forEach(function(name) {
        ret[name] = {
          get: function() {
            return build([name]);
          }
        };
      });
      return ret;
    }
    var sequencer = function sequencer2(map2, str) {
      var exploded = str.split(""), i = 0;
      exploded = exploded.map(map2);
      return exploded.join("");
    };
    colors.trap = require_trap();
    colors.zalgo = require_zalgo();
    colors.maps = {};
    colors.maps.america = require_america();
    colors.maps.zebra = require_zebra();
    colors.maps.rainbow = require_rainbow();
    colors.maps.random = require_random();
    for (map in colors.maps) {
      (function(map2) {
        colors[map2] = function(str) {
          return sequencer(colors.maps[map2], str);
        };
      })(map);
    }
    var map;
    defineProps(colors, init());
  }
});

// node_modules/colors/safe.js
var require_safe = __commonJS({
  "node_modules/colors/safe.js"(exports2, module2) {
    var colors = require_colors();
    module2["exports"] = colors;
  }
});

// node_modules/cli-table/lib/utils.js
var require_utils = __commonJS({
  "node_modules/cli-table/lib/utils.js"(exports2) {
    exports2.repeat = function(str, times) {
      return Array(times + 1).join(str);
    };
    exports2.pad = function(str, len, pad, dir) {
      if (len + 1 >= str.length)
        switch (dir) {
          case "left":
            str = Array(len + 1 - str.length).join(pad) + str;
            break;
          case "both":
            var right = Math.ceil((padlen = len - str.length) / 2);
            var left = padlen - right;
            str = Array(left + 1).join(pad) + str + Array(right + 1).join(pad);
            break;
          default:
            str = str + Array(len + 1 - str.length).join(pad);
        }
      ;
      return str;
    };
    exports2.truncate = function(str, length, chr) {
      chr = chr || "\u2026";
      return str.length >= length ? str.substr(0, length - chr.length) + chr : str;
    };
    function options(defaults, opts) {
      for (var p in opts) {
        if (p === "__proto__" || p === "constructor" || p === "prototype") {
          continue;
        }
        if (opts[p] && opts[p].constructor && opts[p].constructor === Object) {
          defaults[p] = defaults[p] || {};
          options(defaults[p], opts[p]);
        } else {
          defaults[p] = opts[p];
        }
      }
      return defaults;
    }
    exports2.options = options;
    exports2.strlen = function(str) {
      var code = /\u001b\[(?:\d*;){0,5}\d*m/g;
      var stripped = ("" + str).replace(code, "");
      var split = stripped.split("\n");
      return split.reduce(function(memo, s) {
        return s.length > memo ? s.length : memo;
      }, 0);
    };
  }
});

// node_modules/cli-table/lib/index.js
var require_lib = __commonJS({
  "node_modules/cli-table/lib/index.js"(exports2, module2) {
    var colors = require_safe();
    var utils = require_utils();
    var repeat = utils.repeat;
    var truncate = utils.truncate;
    var pad = utils.pad;
    function Table(options) {
      this.options = utils.options({
        chars: {
          "top": "\u2500",
          "top-mid": "\u252C",
          "top-left": "\u250C",
          "top-right": "\u2510",
          "bottom": "\u2500",
          "bottom-mid": "\u2534",
          "bottom-left": "\u2514",
          "bottom-right": "\u2518",
          "left": "\u2502",
          "left-mid": "\u251C",
          "mid": "\u2500",
          "mid-mid": "\u253C",
          "right": "\u2502",
          "right-mid": "\u2524",
          "middle": "\u2502"
        },
        truncate: "\u2026",
        colWidths: [],
        colAligns: [],
        style: {
          "padding-left": 1,
          "padding-right": 1,
          head: ["red"],
          border: ["grey"],
          compact: false
        },
        head: []
      }, options);
      if (options && options.rows) {
        for (var i = 0; i < options.rows.length; i++) {
          this.push(options.rows[i]);
        }
      }
    }
    Table.prototype.__proto__ = Array.prototype;
    Table.prototype.__defineGetter__("width", function() {
      var str = this.toString().split("\n");
      if (str.length) return str[0].length;
      return 0;
    });
    Table.prototype.render;
    Table.prototype.toString = function() {
      var ret = "", options = this.options, style = options.style, head = options.head, chars = options.chars, truncater = options.truncate, colWidths = options.colWidths || new Array(this.head.length), totalWidth = 0;
      if (!head.length && !this.length) return "";
      if (!colWidths.length) {
        var all_rows = this.slice(0);
        if (head.length) {
          all_rows = all_rows.concat([head]);
        }
        ;
        all_rows.forEach(function(cells) {
          if (typeof cells === "object" && cells.length) {
            extractColumnWidths(cells);
          } else {
            var header_cell = Object.keys(cells)[0], value_cell = cells[header_cell];
            colWidths[0] = Math.max(colWidths[0] || 0, get_width(header_cell) || 0);
            if (typeof value_cell === "object" && value_cell.length) {
              extractColumnWidths(value_cell, 1);
            } else {
              colWidths[1] = Math.max(colWidths[1] || 0, get_width(value_cell) || 0);
            }
          }
        });
      }
      ;
      totalWidth = (colWidths.length == 1 ? colWidths[0] : colWidths.reduce(
        function(a, b) {
          return a + b;
        }
      )) + colWidths.length + 1;
      function extractColumnWidths(arr, offset) {
        var offset = offset || 0;
        arr.forEach(function(cell, i) {
          colWidths[i + offset] = Math.max(colWidths[i + offset] || 0, get_width(cell) || 0);
        });
      }
      ;
      function get_width(obj) {
        return typeof obj == "object" && obj.width != void 0 ? obj.width : (typeof obj == "object" ? utils.strlen(obj.text) : utils.strlen(obj)) + (style["padding-left"] || 0) + (style["padding-right"] || 0);
      }
      function line(line2, left, right, intersection) {
        var width = 0, line2 = left + repeat(line2, totalWidth - 2) + right;
        colWidths.forEach(function(w, i) {
          if (i == colWidths.length - 1) return;
          width += w + 1;
          line2 = line2.substr(0, width) + intersection + line2.substr(width + 1);
        });
        return applyStyles(options.style.border, line2);
      }
      ;
      function lineTop() {
        var l2 = line(
          chars.top,
          chars["top-left"] || chars.top,
          chars["top-right"] || chars.top,
          chars["top-mid"]
        );
        if (l2)
          ret += l2 + "\n";
      }
      ;
      function generateRow(items, style2) {
        var cells = [], max_height = 0;
        if (!Array.isArray(items) && typeof items === "object") {
          var key = Object.keys(items)[0], value = items[key], first_cell_head = true;
          if (Array.isArray(value)) {
            items = value;
            items.unshift(key);
          } else {
            items = [key, value];
          }
        }
        items.forEach(function(item, i) {
          var contents = item.toString().split("\n").reduce(function(memo, l2) {
            memo.push(string(l2, i));
            return memo;
          }, []);
          var height = contents.length;
          if (height > max_height) {
            max_height = height;
          }
          ;
          cells.push({ contents, height });
        });
        var lines = new Array(max_height);
        cells.forEach(function(cell, i) {
          cell.contents.forEach(function(line2, j2) {
            if (!lines[j2]) {
              lines[j2] = [];
            }
            ;
            if (style2 || first_cell_head && i === 0 && options.style.head) {
              line2 = applyStyles(options.style.head, line2);
            }
            lines[j2].push(line2);
          });
          for (var j = cell.height, l2 = max_height; j < l2; j++) {
            if (!lines[j]) {
              lines[j] = [];
            }
            ;
            lines[j].push(string("", i));
          }
        });
        var ret2 = "";
        lines.forEach(function(line2, index) {
          if (ret2.length > 0) {
            ret2 += "\n" + applyStyles(options.style.border, chars.left);
          }
          ret2 += line2.join(applyStyles(options.style.border, chars.middle)) + applyStyles(options.style.border, chars.right);
        });
        return applyStyles(options.style.border, chars.left) + ret2;
      }
      ;
      function applyStyles(styles, subject) {
        if (!subject)
          return "";
        styles.forEach(function(style2) {
          subject = colors[style2](subject);
        });
        return subject;
      }
      ;
      function string(str, index) {
        var str = String(typeof str == "object" && str.text ? str.text : str), length = utils.strlen(str), width = colWidths[index] - (style["padding-left"] || 0) - (style["padding-right"] || 0), align = options.colAligns[index] || "left";
        return repeat(" ", style["padding-left"] || 0) + (length == width ? str : length < width ? pad(str, width + (str.length - length), " ", align == "left" ? "right" : align == "middle" ? "both" : "left") : truncater ? truncate(str, width, truncater) : str) + repeat(" ", style["padding-right"] || 0);
      }
      ;
      if (head.length) {
        lineTop();
        ret += generateRow(head, style.head) + "\n";
      }
      if (this.length)
        this.forEach(function(cells, i) {
          if (!head.length && i == 0)
            lineTop();
          else {
            if (!style.compact || i < !!head.length ? 1 : cells.length == 0) {
              var l2 = line(
                chars.mid,
                chars["left-mid"],
                chars["right-mid"],
                chars["mid-mid"]
              );
              if (l2)
                ret += l2 + "\n";
            }
          }
          if (cells.hasOwnProperty("length") && !cells.length) {
            return;
          } else {
            ret += generateRow(cells) + "\n";
          }
          ;
        });
      var l = line(
        chars.bottom,
        chars["bottom-left"] || chars.bottom,
        chars["bottom-right"] || chars.bottom,
        chars["bottom-mid"]
      );
      if (l)
        ret += l;
      else
        ret = ret.slice(0, -1);
      return ret;
    };
    module2.exports = Table;
    module2.exports.version = "0.0.1";
  }
});

// node_modules/csvwriter/lib/csvwriter.js
var require_csvwriter = __commonJS({
  "node_modules/csvwriter/lib/csvwriter.js"(exports2, module2) {
    var jsonpath = require_jsonpath();
    var Table = require_lib();
    module2.exports = csvwriter;
    function csvwriter(data, params, callback) {
      if (typeof params === "function") {
        callback = params;
        params = void 0;
      }
      params = applyDefaults(params);
      if (typeof data !== "object" && !(data instanceof Array)) {
        try {
          data = JSON.parse(data);
        } catch (err) {
          callback(err);
          return;
        }
      }
      if (params.path) {
        try {
          data = jsonpath({ path: params.path, json: data });
        } catch (err) {
          callback(err);
          return;
        }
      }
      if (!(data instanceof Array)) {
        data = [data];
      }
      var columns2 = [];
      var rows = [];
      data.forEach(function(d) {
        rows.push(flatten(d, columns2, params));
      });
      columns2 = params.fields ? params.fields.split(",") : columns2;
      callback(null, params.table ? createCLITable(rows, columns2, params) : createCSV(rows, columns2, params));
    }
    function applyDefaults(params) {
      params = params || {};
      params.tabs = params.tabs || false;
      params.delimiter = params.tabs ? "	" : typeof params.delimiter === "string" ? params.delimiter : ",";
      params.delimiterRegExp = escapeRegExp(params.delimiter);
      params.decimalSeparator = typeof params.decimalSeparator === "string" ? params.decimalSeparator : ".";
      params.arrayDelimiter = typeof params.arrayDelimiter === "string" ? params.arrayDelimiter : ",";
      params.nestingDelimiter = typeof params.nestingDelimiter === "string" ? params.nestingDelimiter : ".";
      params.nullString = typeof params.nullString === "string" ? params.nullString : "";
      params.quote = typeof params.quote === "string" ? params.quote : '"';
      params.quoteRegExp = escapeRegExp(params.quote);
      params.escape = params.escape || null;
      params.escapeRegExp = params.escape !== null ? escapeRegExp(params.escape) : null;
      params.doubleQuote = params.doubleQuote !== false;
      params.suppressLineBreaks = params.suppressLineBreaks || false;
      params.quoteMode = params.quoteMode >= 0 && params.quoteMode <= 3 ? params.quoteMode : 0;
      params.lineNumbers = params.lineNumbers || false;
      params.zero = params.zero || false;
      params.path = params.path || null;
      params.fields = params.fields || null;
      params.maxDepth = typeof params.maxDepth === "number" ? params.maxDepth : -1;
      params.header = params.header !== false;
      params.table = params.table || false;
      params.crlf = params.crlf !== false;
      return params;
    }
    function escapeRegExp(string) {
      return new RegExp(string.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1"), "g");
    }
    function createCLITable(rows, columns2, params) {
      if (params.lineNumbers) {
        columns2 = [""].concat(columns2);
      }
      var table = new Table(params.header ? { head: columns2 } : {});
      rows.forEach(function(row, rowNum) {
        table.push(columns2.map(function(column, colNum) {
          if (colNum === 0 && params.lineNumbers) {
            return params.zero ? rowNum : rowNum + 1;
          }
          return row.hasOwnProperty(column) ? row[column] : params.nullString;
        }));
      });
      return table.toString();
    }
    function createCSV(rows, columns2, params) {
      var newline = params.crlf === false ? "\n" : "\r\n";
      var csv = "";
      var i, ii;
      if (columns2.length && params.header) {
        if (params.lineNumbers) {
          csv += quote("", params) + params.delimiter;
        }
        for (i = 0; i < columns2.length; i++) {
          if (i > 0) {
            csv += params.delimiter;
          }
          csv += quote(columns2[i], params);
        }
        csv += newline;
      }
      for (i = 0; i < rows.length; i++) {
        if (params.lineNumbers) {
          csv += quote(params.zero ? i : i + 1, params) + params.delimiter;
        }
        for (ii = 0; ii < columns2.length; ii++) {
          if (ii > 0) {
            csv += params.delimiter;
          }
          csv += quote(rows[i][columns2[ii]], params);
        }
        csv += newline;
      }
      return csv;
    }
    function flatten(data, columns2, params, path2, row) {
      path2 = path2 || [];
      row = row || {};
      if (params.maxDepth >= 0 && path2.length > params.maxDepth + 1) {
        return row;
      }
      if (data instanceof Array) {
        flattenArray(data, columns2, params, path2, row);
      } else if (data instanceof Date) {
        addField(data.toISOString(), columns2, params, path2, row);
      } else if (typeof data === "object") {
        flattenObject(data, columns2, params, path2, row);
      } else {
        addField(data, columns2, params, path2, row);
      }
      return row;
    }
    function flattenArray(data, columns2, params, path2, row) {
      if (params.arrayDelimiter && data.length > 0 && typeof data[0] !== "object" && !(data[0] instanceof Array)) {
        flatten(data.join(params.arrayDelimiter), columns2, params, path2, row);
      } else {
        var i;
        for (i = 0; i < data.length; i++) {
          flatten(data[i], columns2, params, path2.concat(i), row);
        }
      }
    }
    function flattenObject(data, columns2, params, path2, row) {
      for (var key in data) {
        if (data.hasOwnProperty(key)) {
          flatten(data[key], columns2, params, path2.concat(key), row);
        }
      }
    }
    function addField(data, columns2, params, path2, row) {
      var field = path2.join(params.nestingDelimiter);
      row[field] = data;
      if (columns2.indexOf(field) === -1) {
        columns2.push(field);
      }
    }
    function quote(field, params) {
      var str = escapeFieldValue(field, params);
      var needsQuoting = false;
      if (params.quoteMode === 1) {
        needsQuoting = true;
      } else if (params.quoteMode === 2) {
        needsQuoting = typeof field !== "number";
      } else if (params.quoteMode !== 3) {
        needsQuoting = str.indexOf(params.delimiter) !== -1 || str.indexOf(params.quote) !== -1 || str.indexOf("\r") !== -1 || str.indexOf("\n") !== -1;
      }
      return needsQuoting ? params.quote + str + params.quote : str;
    }
    function escapeFieldValue(field, params) {
      if (field === null || field === void 0) {
        return params.nullString;
      }
      var str = field.toString();
      if (typeof field === "number") {
        str = str.replace(".", params.decimalSeparator);
      }
      if (params.quoteMode !== 3) {
        if (params.doubleQuote) {
          str = str.replace(params.quoteRegExp, params.quote + params.quote);
        }
      } else if (params.escape) {
        str = str.replace(params.escapeRegExp, params.escape + params.escape).replace(params.delimiterRegExp, params.escape + params.delimiter).replace(/(\r?\n)/g, params.escape + "$1");
      }
      if (params.suppressLineBreaks) {
        str = str.replace(/\r/g, "").replace(/\n/g, "");
      }
      return str;
    }
  }
});

// src/main.ts
var fs2 = __toESM(require("fs"));
var path = __toESM(require("path"));

// src/options.ts
var self2 = initOptions();
var invert = self2.invert;
var multi = self2.multi;
var input = self2.input;
var output = self2.output;
var columns = self2.columns;
var header = self2.header;
var encoding = self2.encoding;
var CRLF = self2.CRLF;
var separator = self2.separator;
var obsolete = self2.obsolete;
var overwrite = self2.overwrite;
var isQuote = self2.isQuote;
var LANG_CODE_PLACEHOLDER = "*";
function initOptions() {
  const ret = {
    // invert: false,
    // multi: false,
    // input: 'test/single/original/localization_ja.csv',
    // output: 'test/single/weblate/localization_ja.csv',
    // columns: 'context,source,target,developer_comments'.split(','),
    // header: true,
    // encoding: 'utf8',
    // CRLF: true,
    // separator: ',',
    // obsolete: true,
    // overwrite: false,
    // isQuote: false
    invert: process.env.INVERT == "true",
    multi: process.env.MULTI == "true",
    input: process.env.INPUT,
    output: process.env.OUTPUT,
    columns: (process.env.COLUMNS ?? "").split(","),
    header: process.env.HEADER == "true",
    encoding: process.env.ENCODING,
    CRLF: process.env.CRLF == "true",
    separator: process.env.SEPARATOR,
    obsolete: process.env.OBSOLETE == "true",
    overwrite: process.env.OVERWRITE == "true",
    isQuote: process.env.QUOTING == "true"
  };
  if (ret.multi == false && ret.input.includes("*") !== ret.output.includes("*")) {
    console.error(`Invalid use for lang code in file names: ${ret.input}, ${ret.output}`);
    process.exit(1);
  }
  return ret;
}

// src/convert.ts
var fs = __toESM(require("fs"));
var import_csv_parser = __toESM(require_csv_parser());
var import_csvwriter = __toESM(require_csvwriter());
var DELETED_MARKER = "[DELETED]";
var DELETED_PREFIX = " former ";
var WEBLATE_COLUMNS = ["location", "source", "target", "ID", "fuzzy", "context", "translator_comments", "developer_comments"];
async function convertMonolingual(input2, output2) {
  console.info(`Converting from ${input2} to ${output2} ...`);
  const previousValues = /* @__PURE__ */ new Map();
  if (fs.existsSync(output2)) {
    await new Promise((resolve, reject) => {
      fs.createReadStream(output2).pipe((0, import_csv_parser.default)()).on("data", (data) => {
        if (data["context"] && data["source"]) {
          previousValues.set(data["context"] + data["source"], data);
        }
      }).on("end", resolve).on("error", (error) => {
        reject(error);
      });
    });
  }
  let lineNumber = 0;
  let newCount = 0;
  let deletedCount = 0;
  const outputValues = new Array();
  const discrepancies = new Array();
  const parserOptions = {
    headers: header ? void 0 : false,
    mapHeaders: ({ header: header2, index }) => columns[index],
    separator
  };
  await new Promise((resolve, reject) => {
    fs.createReadStream(input2).pipe((0, import_csv_parser.default)(parserOptions)).on("data", (data) => {
      lineNumber++;
      const index = (data["context"] ?? "") + data["source"];
      const row = {
        location: `${input2}:${lineNumber}`,
        source: data["source"],
        target: data["target"],
        ID: data["ID"] ?? "",
        context: data["context"] ?? "",
        translator_comments: data["translator_comments"] ?? "",
        developer_comments: data["developer_comments"] ?? ""
      };
      if (previousValues.has(index)) {
        const previousRow = previousValues.get(index);
        previousValues.delete(index);
        if (previousRow["target"] != data["target"]) {
          if (overwrite == false) row["target"] = previousRow["target"];
          discrepancies.push(`  * ${data["context"]}, ${data["source"]}: ${data["target"]} <> ${previousRow["target"]}`.replace("\r\n", "\\n").replace("\r", "\\n"));
          row["fuzzy"] = "True";
        } else {
          row["fuzzy"] = previousRow["fuzzy"];
        }
        if (obsolete && String(previousRow["developer_comments"]).includes(DELETED_MARKER)) {
          newCount++;
        }
      } else {
        newCount++;
        row["fuzzy"] = "True";
      }
      outputValues.push(row);
    }).on("end", resolve).on("error", (error) => {
      reject(error);
    });
  });
  for (const value of previousValues.values()) {
    if (obsolete) {
      if (!String(value["developer_comments"]).includes(DELETED_MARKER)) {
        deletedCount++;
        if (obsolete) {
          value["fuzzy"] = "True";
          value["location"] = DELETED_MARKER + DELETED_PREFIX + value["location"];
          value["developer_comments"] = DELETED_MARKER + " " + value["developer_comments"];
        }
      }
      outputValues.push(value);
    } else {
      deletedCount++;
    }
  }
  const csvWriterOptions = {
    crlf: true,
    delimiter: separator,
    fields: WEBLATE_COLUMNS.join(","),
    header,
    quoteMode: 1
    // always quote
  };
  await (0, import_csvwriter.default)(outputValues, csvWriterOptions, (error, csv) => {
    if (error) throw error;
    fs.writeFileSync(output2, csv, encoding);
  });
  const stats = [];
  stats.push(`- in: ${input2}`);
  stats.push(`- out: ${output2}`);
  stats.push(`- new lines: ${newCount}`);
  stats.push(`- deleted lines: ${deletedCount}`);
  if (discrepancies.length > 0) {
    stats.push("- discrepancies: ");
    discrepancies.forEach((discrepancy) => {
      stats.push(discrepancy);
    });
  }
  return stats.join("\n");
}
async function inverseConvertMonolingual(input2, output2) {
  console.info(`Converting from ${input2} to ${output2} ...`);
  const outParserOptions = {
    headers: header ? void 0 : false,
    separator
  };
  let contextColumn = "";
  let sourceColumn = "";
  let targetColumn = "";
  let header2 = [];
  const preValues = /* @__PURE__ */ new Map();
  if (header && fs.existsSync(output2)) {
    await new Promise((resolve, reject) => {
      fs.createReadStream(output2).pipe((0, import_csv_parser.default)(outParserOptions)).on("headers", (head) => {
        header2 = head;
        contextColumn = header2[columns.indexOf("context")];
        sourceColumn = header2[columns.indexOf("source")];
        targetColumn = header2[columns.indexOf("target")];
      }).on("data", (data) => {
        const index = (data[contextColumn] ?? "") + data[sourceColumn];
        preValues[index] = data;
      }).on("end", resolve).on("error", (error) => {
        reject(error);
      });
    });
  } else {
    for (let i = 0; i < columns.length; i++) header2.push(String(i));
  }
  const columnMap = {};
  WEBLATE_COLUMNS.forEach((key) => {
    if (columns.includes(key)) {
      columnMap[key] = header2[columns.indexOf(key)];
    }
  });
  const parserOptions = {
    headers: header ? void 0 : false,
    mapHeaders: ({ header: header3, index }) => columnMap[header3],
    separator
  };
  let lines = 0;
  await new Promise((resolve, reject) => {
    fs.createReadStream(input2).pipe((0, import_csv_parser.default)(parserOptions)).on("data", (data) => {
      const index = (data[contextColumn] ?? "") + data[sourceColumn];
      if (preValues[index] && preValues[index][targetColumn]) {
        if (preValues[index][targetColumn] != data[targetColumn]) {
          lines++;
          preValues[index][targetColumn] = data[targetColumn];
        }
      }
    }).on("end", resolve).on("error", (error) => {
      reject(error);
    });
  });
  const writerOptions = {
    crlf: CRLF,
    delimiter: separator,
    quoteMode: isQuote ? 1 : 0,
    header,
    fields: header2.join(",")
  };
  const outputValues = [];
  for (const key in preValues) {
    outputValues.push(preValues[key]);
  }
  await (0, import_csvwriter.default)(outputValues, writerOptions, (error, csv) => {
    if (error) throw error;
    fs.writeFileSync(output2, csv, encoding);
  });
  return `in: ${input2}
out: ${output2}
updated lines: ${lines}`;
}

// src/main.ts
async function run() {
  try {
    if (multi) {
    } else if (invert) {
      iterateFilesMonolingual(inverseConvertMonolingual);
    } else {
      iterateFilesMonolingual(convertMonolingual);
    }
  } catch (error) {
    console.error("Failed: " + error.message);
    process.exit(1);
  }
}
async function iterateFilesMonolingual(callback) {
  const stats = [];
  const hasPlaceholder = input.includes(LANG_CODE_PLACEHOLDER);
  const INPUT_REGEXP = RegExp(input.replace(".", "\\.").replace(LANG_CODE_PLACEHOLDER, "(?<langCode>.+)"));
  for (const input2 of fs2.globSync(input)) {
    let output2 = output;
    if (output2.includes(LANG_CODE_PLACEHOLDER)) {
      const langMatch = input2.match(INPUT_REGEXP);
      if (langMatch?.groups == void 0) {
        console.warn(`language code not found, skipped ${input2}`);
        continue;
      }
      output2 = output.replace(LANG_CODE_PLACEHOLDER, langMatch.groups.langCode);
    }
    const outputDir = path.dirname(output2);
    if (!fs2.existsSync(outputDir)) fs2.mkdirSync(outputDir);
    const result = await callback(input2, output2);
    stats.push(result);
  }
  fs2.writeFileSync(process.env.STATS_FILE, stats.join("\n----\n"), "utf8");
  console.info("Done.");
}
run();
