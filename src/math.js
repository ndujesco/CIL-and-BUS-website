/* ─────────────────────────────────────────────────────────────────
   A very small TeX subset, set as MathML.

   Enough of TeX for the working lines in these banks: \frac, \sqrt,
   \bar, \overline, \text, sub/superscripts and the usual operators.
   Anything more elaborate is not needed and is not supported.

   Two renderings come out of one parse:
     .m   MathML, used wherever the browser supports it
     .p   a Unicode one-liner, used where it does not
   ───────────────────────────────────────────────────────────────── */

var TEX_OP = {
  times:"×", cdot:"·", div:"÷", pm:"±", mp:"∓", approx:"≈", neq:"≠", ne:"≠",
  le:"≤", leq:"≤", ge:"≥", geq:"≥", to:"→", rightarrow:"→", gets:"←",
  cdots:"⋯", ldots:"…", dots:"…", infty:"∞", sum:"∑", prod:"∏",
  Sigma:"Σ", Delta:"Δ", percent:"%", ast:"∗", star:"⋆", circ:"∘"
};
var TEX_ID = { alpha:"α", beta:"β", mu:"μ", pi:"π", sigma:"σ", theta:"θ", lambda:"λ" };
var SUP = {"0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹",
           "n":"ⁿ","i":"ⁱ","+":"⁺","-":"⁻","−":"⁻","(":"⁽",")":"⁾"};
var SUB = {"0":"₀","1":"₁","2":"₂","3":"₃","4":"₄","5":"₅","6":"₆","7":"₇","8":"₈","9":"₉",
           "n":"ₙ","i":"ᵢ","+":"₊","-":"₋","−":"₋","(":"₍",")":"₎"};
var OPCHARS = "+-−*/=<>,;:!|()[]±×÷≈≤≥≠→⋅∑√";

function texScan(src){
  var t = [], i = 0, s = String(src).replace(/\{,\}/g, ","), m;
  while(i < s.length){
    var c = s.charAt(i);
    if(c === " " || c === "\t" || c === "\n"){ i++; continue; }
    if(c === "\\"){
      m = /^\\([A-Za-z]+|.)/.exec(s.slice(i));
      var cmd = m[1];
      /* \text{…} and friends keep their braces verbatim, spaces and all */
      if(cmd === "text" || cmd === "mathrm" || cmd === "textbf" || cmd === "operatorname"){
        var upright = cmd === "mathrm" || cmd === "operatorname";
        var j = i + m[0].length, depth = 0, buf = "";
        if(s.charAt(j) === "{"){
          for(depth = 1, j++; j < s.length && depth; j++){
            var d = s.charAt(j);
            if(d === "{") depth++;
            else if(d === "}"){ if(!--depth) break; }
            buf += d;
          }
          j++;
        }
        t.push({ k:upright ? "rm" : "text", v:buf, bold:cmd === "textbf" }); i = j; continue;
      }
      t.push({ k:"cmd", v:cmd }); i += m[0].length; continue;
    }
    if(c === "{" || c === "}" || c === "^" || c === "_"){ t.push({ k:c }); i++; continue; }
    if(c >= "0" && c <= "9"){
      m = /^[0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?/.exec(s.slice(i));
      t.push({ k:"num", v:m[0] }); i += m[0].length; continue;
    }
    if(/[A-Za-z]/.test(c)){ t.push({ k:"id", v:c }); i++; continue; }
    if(OPCHARS.indexOf(c) >= 0){ t.push({ k:"op", v:c }); i++; continue; }
    t.push({ k:"txt", v:c }); i++;                    /* ₦, %, ° and the like */
  }
  return t;
}

function mrow(a){ return a.length === 1 ? a[0] : "<mrow>" + a.join("") + "</mrow>"; }
function needsBrackets(p){ return /[+\-−*/=<>±×÷ ]/.test(p); }
function wrap(p){ return needsBrackets(p) ? "(" + p + ")" : p; }

/* one atom, plus any scripts hanging off it */
function texAtom(ts, i){
  var t = ts[i], a = null;
  if(!t) return null;

  if(t.k === "{"){ var g = texSeq(ts, i + 1, true); a = { m:mrow(g.m), p:g.p, i:g.i }; }
  else if(t.k === "num")  a = { m:"<mn>" + t.v + "</mn>", p:t.v, i:i + 1 };
  else if(t.k === "id")   a = { m:"<mi>" + t.v + "</mi>", p:t.v, i:i + 1 };
  else if(t.k === "rm")   a = { m:'<mi mathvariant="normal">' + esc(t.v) + "</mi>", p:t.v, i:i + 1 };
  else if(t.k === "op")   a = { m:"<mo>" + esc(t.v) + "</mo>", p:t.v, i:i + 1 };
  else if(t.k === "txt")  a = { m:"<mtext>" + esc(t.v) + "</mtext>", p:t.v, i:i + 1 };
  else if(t.k === "text") a = { m:"<mtext>" + (t.bold ? "<b>" + esc(t.v) + "</b>" : esc(t.v)) + "</mtext>",
                                p:t.v, i:i + 1 };
  else if(t.k === "cmd"){
    var c = t.v, x, y;
    if(c === "frac" || c === "dfrac" || c === "tfrac"){
      x = texAtom(ts, i + 1); y = texAtom(ts, x ? x.i : i + 1);
      a = { m:"<mfrac>" + (x ? x.m : "<mi></mi>") + (y ? y.m : "<mi></mi>") + "</mfrac>",
            p:wrap(x ? x.p : "") + "/" + wrap(y ? y.p : ""), frac:true, i:y ? y.i : i + 1 };
    } else if(c === "sqrt"){
      var j = i + 1, root = null;
      if(ts[j] && ts[j].k === "op" && ts[j].v === "["){          /* \sqrt[3]{…} */
        var k = j + 1, inner = [];
        while(ts[k] && !(ts[k].k === "op" && ts[k].v === "]")) inner.push(ts[k++]);
        root = texSeq(inner, 0, false); j = k + 1;
      }
      x = texAtom(ts, j);
      a = root
        ? { m:"<mroot>" + (x ? x.m : "") + mrow(root.m) + "</mroot>",
            p:root.p + "√(" + (x ? x.p : "") + ")", i:x ? x.i : j }
        : { m:"<msqrt>" + (x ? x.m : "") + "</msqrt>",
            p:"√(" + (x ? x.p : "") + ")", i:x ? x.i : j };
    } else if(c === "bar" || c === "overline" || c === "hat" || c === "vec"){
      x = texAtom(ts, i + 1);
      var acc = c === "hat" ? "&#x5E;" : c === "vec" ? "&#x2192;" : "&#xAF;";
      var acp = c === "hat" ? "̂"  : c === "vec" ? "⃗"   : "̄";
      a = { m:'<mover accent="true">' + (x ? x.m : "") + "<mo>" + acc + "</mo></mover>",
            p:(x ? x.p : "").replace(/(.)$/, "$1" + acp), i:x ? x.i : i + 1 };
    } else if(c === "left" || c === "right" || c === "displaystyle" || c === "limits"){
      return texAtom(ts, i + 1);                                  /* transparent */
    } else if(c === "quad" || c === "qquad"){
      a = { m:'<mspace width="' + (c === "quad" ? "1em" : "2em") + '"/>',
            p:c === "quad" ? "   " : "      ", i:i + 1 };
    } else if(c === "," || c === ";" || c === ":" || c === " "){
      a = { m:'<mspace width="0.28em"/>', p:" ", i:i + 1 };
    } else if(c === "!"){
      a = { m:'<mspace width="-0.17em"/>', p:"", i:i + 1 };
    } else if(c === "%" || c === "$" || c === "#" || c === "&" || c === "{" || c === "}"){
      a = { m:"<mtext>" + esc(c) + "</mtext>", p:c, i:i + 1 };
    } else if(TEX_OP[c]){
      a = { m:"<mo>" + esc(TEX_OP[c]) + "</mo>", p:TEX_OP[c], i:i + 1 };
    } else if(TEX_ID[c]){
      a = { m:"<mi>" + TEX_ID[c] + "</mi>", p:TEX_ID[c], i:i + 1 };
    } else {
      a = { m:'<mi mathvariant="normal">' + esc(c) + "</mi>", p:c, i:i + 1 };
    }
  }
  else return null;

  /* scripts: x^2, D_3, x_i^2 */
  var sup = null, sub = null;
  while(ts[a.i] && (ts[a.i].k === "^" || ts[a.i].k === "_")){
    var kind = ts[a.i].k, s = texAtom(ts, a.i + 1);
    if(!s) break;
    if(kind === "^") sup = s; else sub = s;
    a.i = s.i;
  }
  if(sup && sub){
    a.m = "<msubsup>" + a.m + sub.m + sup.m + "</msubsup>";
    a.p = a.p + plainScript(sub.p, SUB, "_") + plainScript(sup.p, SUP, "^");
  } else if(sup){
    a.m = "<msup>" + a.m + sup.m + "</msup>";
    a.p = a.p + plainScript(sup.p, SUP, "^");
  } else if(sub){
    a.m = "<msub>" + a.m + sub.m + "</msub>";
    a.p = a.p + plainScript(sub.p, SUB, "_");
  }
  return a;
}

function plainScript(txt, map, mark){
  var out = "";
  txt = txt.replace(/\s+/g, "");
  for(var i = 0; i < txt.length; i++){
    if(!map[txt.charAt(i)]) return mark + wrap(txt);
    out += map[txt.charAt(i)];
  }
  return out;
}

function texSeq(ts, i, untilBrace){
  var m = [], parts = [], frac = [];
  while(i < ts.length){
    if(ts[i].k === "}"){ i++; if(untilBrace) break; continue; }
    var a = texAtom(ts, i);
    if(!a){ i++; continue; }
    m.push(a.m); parts.push(a.p); frac.push(!!a.frac); i = a.i;
  }
  /* a/b needs brackets in plain text where the fraction touches its neighbours */
  parts.forEach(function(x, j){
    if(!frac[j]) return;
    if(/[A-Za-z0-9)]$/.test(parts[j - 1] || "") || /^[A-Za-z0-9(]/.test(parts[j + 1] || ""))
      parts[j] = "(" + x + ")";
  });
  var rel = /[=+<>\u2248\u2264\u2265\u2260\u2192\u00b1\u00d7\u00f7\u2212-]/;
  var p = "";
  parts.forEach(function(x){
    if(p && !/\s$/.test(p) && (rel.test(x.charAt(0)) || rel.test(p.slice(-1)))) p += " ";
    p += x;
  });
  return { m:m, p:p, i:i };
}

function texParse(src){
  var r = texSeq(texScan(src), 0, false);
  return { m:mrow(r.m), p:r.p.replace(/[ ]{4,}/g, "   ").trim() };
}

/* MathML is native everywhere current, but check rather than assume. */
var MATH_OK = null;
function mathSupported(){
  if(MATH_OK !== null) return MATH_OK;
  try{
    var d = document.createElement("div");
    d.style.cssText = "position:absolute;left:-9999px;top:0;visibility:hidden";
    d.innerHTML = '<math><mspace height="23px" width="77px"></mspace></math>';
    document.body.appendChild(d);
    var box = d.firstChild.firstChild.getBoundingClientRect();
    document.body.removeChild(d);
    MATH_OK = Math.abs(box.height - 23) < 2 && Math.abs(box.width - 77) < 2;
  }catch(e){ MATH_OK = false; }
  return MATH_OK;
}

/* one expression */
function mtex(tex, display){
  var r = texParse(tex);
  if(mathSupported())
    return '<math' + (display ? ' display="block"' : "") + ">" + r.m + "</math>";
  return '<span class="eqtxt">' + esc(r.p) + "</span>";
}

/* prose with $…$ islands in it */
function mtxt(s){
  s = String(s);
  var parts = s.split("$");
  if(parts.length % 2 === 0) return esc(s);          /* unbalanced: leave it alone */
  return parts.map(function(part, i){
    return i % 2 ? mtex(part, false) : esc(part);
  }).join("");
}
