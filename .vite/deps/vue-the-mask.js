import {
  __commonJS
} from "./chunk-76J2PTFD.js";

// node_modules/vue-the-mask/dist/vue-the-mask.js
var require_vue_the_mask = __commonJS({
  "node_modules/vue-the-mask/dist/vue-the-mask.js"(exports, module) {
    (function(e, t) {
      "object" == typeof exports && "object" == typeof module ? module.exports = t() : "function" == typeof define && define.amd ? define([], t) : "object" == typeof exports ? exports.VueTheMask = t() : e.VueTheMask = t();
    })(exports, function() {
      return function(e) {
        function t(r) {
          if (n[r])
            return n[r].exports;
          var a = n[r] = { i: r, l: false, exports: {} };
          return e[r].call(a.exports, a, a.exports, t), a.l = true, a.exports;
        }
        var n = {};
        return t.m = e, t.c = n, t.i = function(e2) {
          return e2;
        }, t.d = function(e2, n2, r) {
          t.o(e2, n2) || Object.defineProperty(e2, n2, { configurable: false, enumerable: true, get: r });
        }, t.n = function(e2) {
          var n2 = e2 && e2.__esModule ? function() {
            return e2.default;
          } : function() {
            return e2;
          };
          return t.d(n2, "a", n2), n2;
        }, t.o = function(e2, t2) {
          return Object.prototype.hasOwnProperty.call(e2, t2);
        }, t.p = ".", t(t.s = 10);
      }([function(e, t) {
        e.exports = { "#": { pattern: /\d/ }, X: { pattern: /[0-9a-zA-Z]/ }, S: { pattern: /[a-zA-Z]/ }, A: { pattern: /[a-zA-Z]/, transform: function(e2) {
          return e2.toLocaleUpperCase();
        } }, a: { pattern: /[a-zA-Z]/, transform: function(e2) {
          return e2.toLocaleLowerCase();
        } }, "!": { escape: true } };
      }, function(e, t, n) {
        "use strict";
        function r(e2) {
          var t2 = document.createEvent("Event");
          return t2.initEvent(e2, true, true), t2;
        }
        var a = n(2), o = n(0), i = n.n(o);
        t.a = function(e2, t2) {
          var o2 = t2.value;
          if ((Array.isArray(o2) || "string" == typeof o2) && (o2 = { mask: o2, tokens: i.a }), "INPUT" !== e2.tagName.toLocaleUpperCase()) {
            var u = e2.getElementsByTagName("input");
            if (1 !== u.length)
              throw new Error("v-mask directive requires 1 input, found " + u.length);
            e2 = u[0];
          }
          e2.oninput = function(t3) {
            if (t3.isTrusted) {
              var i2 = e2.selectionEnd, u2 = e2.value[i2 - 1];
              for (e2.value = n.i(a.a)(e2.value, o2.mask, true, o2.tokens); i2 < e2.value.length && e2.value.charAt(i2 - 1) !== u2; )
                i2++;
              e2 === document.activeElement && (e2.setSelectionRange(i2, i2), setTimeout(function() {
                e2.setSelectionRange(i2, i2);
              }, 0)), e2.dispatchEvent(r("input"));
            }
          };
          var s = n.i(a.a)(e2.value, o2.mask, true, o2.tokens);
          s !== e2.value && (e2.value = s, e2.dispatchEvent(r("input")));
        };
      }, function(e, t, n) {
        "use strict";
        var r = n(6), a = n(5);
        t.a = function(e2, t2) {
          var o = !(arguments.length > 2 && void 0 !== arguments[2]) || arguments[2], i = arguments[3];
          return Array.isArray(t2) ? n.i(a.a)(r.a, t2, i)(e2, t2, o, i) : n.i(r.a)(e2, t2, o, i);
        };
      }, function(e, t, n) {
        "use strict";
        function r(e2) {
          e2.component(s.a.name, s.a), e2.directive("mask", i.a);
        }
        Object.defineProperty(t, "__esModule", { value: true });
        var a = n(0), o = n.n(a), i = n(1), u = n(7), s = n.n(u);
        n.d(t, "TheMask", function() {
          return s.a;
        }), n.d(t, "mask", function() {
          return i.a;
        }), n.d(t, "tokens", function() {
          return o.a;
        }), n.d(t, "version", function() {
          return c;
        });
        var c = "0.11.1";
        t.default = r, "undefined" != typeof window && window.Vue && window.Vue.use(r);
      }, function(e, t, n) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: true });
        var r = n(1), a = n(0), o = n.n(a), i = n(2);
        t.default = { name: "TheMask", props: { value: [String, Number], mask: { type: [String, Array], required: true }, masked: { type: Boolean, default: false }, tokens: { type: Object, default: function() {
          return o.a;
        } } }, directives: { mask: r.a }, data: function() {
          return { lastValue: null, display: this.value };
        }, watch: { value: function(e2) {
          e2 !== this.lastValue && (this.display = e2);
        }, masked: function() {
          this.refresh(this.display);
        } }, computed: { config: function() {
          return { mask: this.mask, tokens: this.tokens, masked: this.masked };
        } }, methods: { onInput: function(e2) {
          e2.isTrusted || this.refresh(e2.target.value);
        }, refresh: function(e2) {
          this.display = e2;
          var e2 = n.i(i.a)(e2, this.mask, this.masked, this.tokens);
          e2 !== this.lastValue && (this.lastValue = e2, this.$emit("input", e2));
        } } };
      }, function(e, t, n) {
        "use strict";
        function r(e2, t2, n2) {
          return t2 = t2.sort(function(e3, t3) {
            return e3.length - t3.length;
          }), function(r2, a) {
            for (var o = !(arguments.length > 2 && void 0 !== arguments[2]) || arguments[2], i = 0; i < t2.length; ) {
              var u = t2[i];
              i++;
              var s = t2[i];
              if (!(s && e2(r2, s, true, n2).length > u.length))
                return e2(r2, u, o, n2);
            }
            return "";
          };
        }
        t.a = r;
      }, function(e, t, n) {
        "use strict";
        function r(e2, t2) {
          var n2 = !(arguments.length > 2 && void 0 !== arguments[2]) || arguments[2], r2 = arguments[3];
          e2 = e2 || "", t2 = t2 || "";
          for (var a = 0, o = 0, i = ""; a < t2.length && o < e2.length; ) {
            var u = t2[a], s = r2[u], c = e2[o];
            s && !s.escape ? (s.pattern.test(c) && (i += s.transform ? s.transform(c) : c, a++), o++) : (s && s.escape && (a++, u = t2[a]), n2 && (i += u), c === u && o++, a++);
          }
          for (var f = ""; a < t2.length && n2; ) {
            var u = t2[a];
            if (r2[u]) {
              f = "";
              break;
            }
            f += u, a++;
          }
          return i + f;
        }
        t.a = r;
      }, function(e, t, n) {
        var r = n(8)(n(4), n(9), null, null);
        e.exports = r.exports;
      }, function(e, t) {
        e.exports = function(e2, t2, n, r) {
          var a, o = e2 = e2 || {}, i = typeof e2.default;
          "object" !== i && "function" !== i || (a = e2, o = e2.default);
          var u = "function" == typeof o ? o.options : o;
          if (t2 && (u.render = t2.render, u.staticRenderFns = t2.staticRenderFns), n && (u._scopeId = n), r) {
            var s = u.computed || (u.computed = {});
            Object.keys(r).forEach(function(e3) {
              var t3 = r[e3];
              s[e3] = function() {
                return t3;
              };
            });
          }
          return { esModule: a, exports: o, options: u };
        };
      }, function(e, t) {
        e.exports = { render: function() {
          var e2 = this, t2 = e2.$createElement;
          return (e2._self._c || t2)("input", { directives: [{ name: "mask", rawName: "v-mask", value: e2.config, expression: "config" }], attrs: { type: "text" }, domProps: { value: e2.display }, on: { input: e2.onInput } });
        }, staticRenderFns: [] };
      }, function(e, t, n) {
        e.exports = n(3);
      }]);
    });
  }
});
export default require_vue_the_mask();
//# sourceMappingURL=vue-the-mask.js.map
