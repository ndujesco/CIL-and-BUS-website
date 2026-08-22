(function(){
"use strict";
var LET = ["A","B","C","D","E","F"];
var ORDER = ["cil-pq","bus-pq","cil-new","bus-new"];
var app = document.getElementById("app");
var state = { view:"home", bank:null, i:0, order:[], picks:{}, shown:{},
              mode:"study", topic:"*", panel:false };

/* ── storage ───────────────────────────────────────────────────────
   localStorage can be unavailable in a sandboxed frame, so an in-memory
   cache backs it: the session always works, persistence is the bonus. */
var mem = {};
function load(k){
  if(k in mem) return mem[k];
  try{ var v = localStorage.getItem("satas:"+k); mem[k] = v ? JSON.parse(v) : null; }
  catch(e){ mem[k] = null; }
  return mem[k];
}
function save(k,v){ mem[k] = v; try{ localStorage.setItem("satas:"+k, JSON.stringify(v)); }catch(e){} }
function drop(k){ mem[k] = null; try{ localStorage.removeItem("satas:"+k); }catch(e){} }

function progressOf(id){
  var p = load(id), done = 0, right = 0;
  if(p && p.picks) for(var k in p.picks){ done++; if(p.picks[k] === BANKS[id].q[k].a) right++; }
  return {done:done, right:right, total:BANKS[id].q.length};
}

/* ── helpers ───────────────────────────────────────────────────── */
function esc(s){ return String(s).replace(/[&<>"]/g,function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function topicsOf(b){ var seen={}, out=[]; b.q.forEach(function(q){ if(!seen[q.t]){seen[q.t]=1;out.push(q.t);} }); return out; }
function shuffle(a){ for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i];a[i]=a[j];a[j]=t; } }
function persist(){ save(state.bank,
  {picks:state.picks, shown:state.shown, mode:state.mode}); }
function visible(){
  if(state.topic === "*") return state.order;
  var b = BANKS[state.bank];
  return state.order.filter(function(i){ return b.q[i].t === state.topic; });
}

/* ── routing ───────────────────────────────────────────────────────
   Each bank is a real page with its own URL, so Back works and a
   quiz can be bookmarked or shared. */
function route(){
  var h = (location.hash || "").replace(/^#\/?/, "");
  var parts = h.split("/");
  var id = parts[0];
  if(id === "notes"){
    if(DOCS[parts[1]]) renderDoc(parts[1], parts[2]);
    else renderNotes();
  } else if(BANKS[id]){
    if(state.bank !== id) enterBank(id);
    if(parts[1] === "results"){ state.view = "results"; renderResults(); }
    else { state.view = "quiz"; renderQuiz(); }
  } else {
    state.view = "home"; state.bank = null; renderHome();
  }
}
function go(hash){ if(location.hash === hash) route(); else location.hash = hash; }
window.addEventListener("hashchange", route);

function enterBank(id){
  var b = BANKS[id], saved = load(id) || {};
  state.bank = id;
  state.picks = saved.picks || {};
  state.shown = saved.shown || {};
  state.mode = saved.mode || "study";
  state.topic = "*"; state.panel = false;
  state.order = b.q.map(function(_,i){ return i; });
  state.i = 0;
  for(var k=0;k<state.order.length;k++){
    if(state.picks[state.order[k]] === undefined){ state.i = k; break; }
  }
}

/* ── home ──────────────────────────────────────────────────────── */
function renderHome(){
  document.body.setAttribute("data-view","home");
  document.documentElement.removeAttribute("data-course");
  var total = ORDER.reduce(function(n,id){ return n + BANKS[id].q.length; },0);
  var pq = BANKS["cil-pq"].q.length + BANKS["bus-pq"].q.length;

  var cards = ORDER.map(function(id){
    var b = BANKS[id], p = progressOf(id);
    var pct = p.total ? Math.round(p.done/p.total*100) : 0;
    return '<button class="card" data-course="'+b.course+'" data-go="'+id+'">'
      + '<span class="row1"><span class="code">'+esc(b.course)+' '+(b.course==="CIL"?"524":"440")+'</span>'
      + '<span class="kind">'+(b.kind==="pq"?"Past paper":"New material")+'</span></span>'
      + '<h2>'+esc(b.title)+'</h2>'
      + '<span class="sub" style="display:block">'+esc(b.subtitle)+'</span>'
      + '<span class="foot"><span class="n">'+b.q.length+'</span> questions'
      + (p.done ? '<span>· '+p.done+' answered · '+Math.round(p.right/p.done*100)+'% right</span>' : '')
      + '<span class="go">Start &rarr;</span></span>'
      + '<span class="bar"><i style="width:'+pct+'%"></i></span></button>';
  }).join("");

  app.innerHTML = '<div class="wrap"><section class="hero">'
    + '<span class="eyebrow">University of Lagos · 400 level engineering</span>'
    + '<h1>Two courses, four question banks, one answer sheet.</h1>'
    + '<p>Every past question from the CIL 524 and BUS 440 papers, worked from the course materials '
    + 'themselves, plus fresh questions written in the same style from the 2025/26 lectures, '
    + 'slides and class notes. Shade an answer and the reasoning appears underneath.</p>'
    + '<div class="tally"><span><b>'+total+'</b> questions</span><span><b>'+pq+'</b> from past papers</span>'
    + '<span><b>'+(total-pq)+'</b> newly written</span><span><b>2</b> courses</span></div></section>'
    + '<div class="deck">'+cards+'</div>'
    + '<button class="libcard" data-go="notes">'
    + '<span><h3>Read the materials</h3>'
    + '<p>All ' + Object.keys(DOCS).length + ' documents the answers were worked from: the nine '
    + 'CIL class notes and three decks, and the six BUS lecturer blocks. '
    + 'Every question links straight to the one it rests on.</p></span>'
    + '<span class="go">Open &rarr;</span></button>'
    + '<section class="legend">'
    + '<div><h3>Where the answers come from</h3><p>Every answer on both papers is worked from the '
    + '<b>2025/26 course materials</b>: Classes 1&ndash;9 and the slide decks for CIL, the six '
    + 'lecturer blocks for BUS. Every question carries the class, slide or block it rests on, '
    + 'and that label opens the document itself. Where the 2024/25 BUS paper strayed outside '
    + 'them, the label links out to the web instead.</p></div>'
    + '<div><h3>No marking scheme was used</h3><p>The CIL paper came with a marked student script. It is '
    + '<b>not</b> a source here and was not used at any point. Where it disagreed with the lecture '
    + 'notes, the notes win and the difference is spelt out.</p></div>'
    + '<div><h3>Where a question is broken</h3><p>Eight questions across the two past papers are '
    + 'defective as printed: duplicated '
    + 'options, a stem that contradicts its own choices, an answer no option supports. Those carry a '
    + '<b>check this</b> note setting out the conflict rather than quietly picking a side.</p></div>'
    + '<div><h3>Working</h3><p>Answers save as you go. Shuffle to break the order you have memorised, filter '
    + 'to one topic, or switch to <b>exam mode</b> to sit a bank straight through with no feedback until '
    + 'you finish.</p></div></section></div>';

  document.getElementById("foot-note").textContent =
    "Built from the CIL 524 and BUS 440 course folders. Past questions are transcribed as printed, including their typographical errors. Answers and explanations are study aids derived from the lecture materials, not an official marking scheme. Check anything that matters against your lecturer.";
}

function tallyHTML(done, right, wrong){
  if(state.mode === "exam") return '<span>'+done+' answered</span>';
  return '<span class="r">'+right+' <em>right</em></span>'
       + '<span class="x">'+wrong+' <em>wrong</em></span>';
}

/* ── quiz page ─────────────────────────────────────────────────── */
function renderQuiz(){
  var b = BANKS[state.bank], vis = visible();
  document.body.setAttribute("data-view","quiz");
  document.documentElement.setAttribute("data-course", b.course);
  if(state.i >= vis.length) state.i = Math.max(0, vis.length-1);

  var done=0, right=0, wrong=0;
  vis.forEach(function(i){ var p=state.picks[i];
    if(p!==undefined){ done++; if(p===b.q[i].a) right++; else wrong++; } });
  var pct = vis.length ? Math.round(done/vis.length*100) : 0;
  var marks = tallyHTML(done, right, wrong);

  app.innerHTML = '<div class="qpage">'
    + '<div class="qbar"><div class="qbar-in">'
    + '<button class="exit" data-home>&larr; Banks</button>'
    + '<span class="name">'+esc(b.title)+'</span>'
    + '<span class="tally2">'+marks+'</span></div>'
    + '<div class="qprog"><i style="width:'+pct+'%"></i></div></div>'
    + '<div class="qbody"><div class="col" id="col"></div></div>'
    + '<div class="qfoot"><div class="qfoot-in">'
    + '<button class="btn" id="prev">&larr; Prev</button>'
    + '<button class="btn pri" id="next">'+(state.i===vis.length-1?"Finish":"Next &rarr;")+'</button>'
    + '<button class="btn" id="jump">Options</button>'
    + '<span class="pos">'+(vis.length?state.i+1:0)+' / '+vis.length+'</span>'
    + '</div></div></div>';

  drawQuestion();
  document.getElementById("prev").onclick = prev;
  document.getElementById("next").onclick = advance;
  document.getElementById("jump").onclick = openPanel;
  if(state.panel) openPanel();
}

function drawQuestion(){
  var b = BANKS[state.bank], vis = visible(), col = document.getElementById("col");
  if(!col) return;
  if(!vis.length){
    col.innerHTML = '<div class="qcard"><div class="stem">No questions match this topic. '
      + 'Open <b>Options</b> and choose another.</div></div>';
    document.getElementById("prev").disabled = true;
    return;
  }
  var qi = vis[state.i], q = b.q[qi], pick = state.picks[qi];
  /* Study mode reveals an answer two ways: you shade one, or you give up and
     ask. Asking is remembered, so the answer sheet shows what you looked up. */
  var asked = !!state.shown[qi];
  var reveal = (pick !== undefined || asked) && state.mode === "study";

  var opts = q.o.map(function(text, oi){
    var st = "";
    if(reveal){ if(oi===q.a) st="ok"; else if(oi===pick) st="no"; }
    else if(pick===oi) st="pick";
    var tag = st==="ok" ? '<span class="tag">'+(pick===undefined ? "Answer" : "Correct")+'</span>'
            : st==="no" ? '<span class="tag">Your answer</span>' : '';
    return '<button class="opt" data-st="'+st+'" data-pick="'+oi+'"'+(reveal?' disabled':'')+'>'
      + '<span class="bub">'+LET[oi]+'</span><span class="txt">'+mtxt(text)+'</span>'+tag+'</button>';
  }).join("");

  var why = "";
  if(reveal){
    why = '<div class="why"><span class="eyebrow">'
      + (pick===undefined ? "Looked up &middot; the answer is "+LET[q.a]
         : pick===q.a ? "Correct" : "The answer is "+LET[q.a]) + '</span>'
      + '<p>'+mtxt(q.w)+'</p>'
      + (q.calc ? '<div class="calc">'+mtex(q.calc, true)+'</div>' : '')
      + (q.flag ? '<div class="flag"><b>Check this</b>'+mtxt(q.flag)+'</div>' : '')
      + whenceHTML(q, qi)
      + '</div>';
  }

  col.innerHTML = '<article class="qcard">'
    + '<div class="qhead"><span class="qnum">'+(qi+1)+'</span>'
    + '<span class="qtopic">'+esc(q.t)+'</span>'
    /* Exam mode withholds the source with the marks: a label like
       "Eight dimensions of quality" answers the question on its own. */
    + '<span class="qsrc">'+(state.mode === "exam" ? "" : srcHTML(q, qi))+'</span></div>'
    + '<div class="stem">'+mtxt(q.q)+'</div>'
    + '<div class="opts" id="opts">'+opts+'</div>'
    + (reveal || state.mode === "exam" ? ""
       : '<button class="showans" id="show">Show the answer</button>')
    + why + '</article>';

  document.getElementById("opts").onclick = function(e){
    var o = e.target.closest("[data-pick]"); if(!o || o.disabled) return; choose(+o.dataset.pick); };
  var sh = document.getElementById("show");
  if(sh) sh.onclick = reveal_it;
  document.getElementById("prev").disabled = state.i === 0;
}

/* Redraw only what changed, so the page does not jump. */
function refreshChrome(){
  var b = BANKS[state.bank], vis = visible();
  var done=0, right=0, wrong=0;
  vis.forEach(function(i){ var p=state.picks[i];
    if(p!==undefined){ done++; if(p===b.q[i].a) right++; else wrong++; } });
  var t = document.querySelector(".tally2");
  if(t) t.innerHTML = tallyHTML(done, right, wrong);
  var p = document.querySelector(".qprog i");
  if(p) p.style.width = (vis.length ? Math.round(done/vis.length*100) : 0)+"%";
  var pos = document.querySelector(".qfoot .pos");
  if(pos) pos.textContent = (vis.length?state.i+1:0)+" / "+vis.length;
  var nx = document.getElementById("next");
  if(nx) nx.innerHTML = state.i===vis.length-1 ? "Finish" : "Next &rarr;";
}

function choose(oi){
  var vis = visible(); if(!vis.length) return;
  var qi = vis[state.i];
  if(state.picks[qi] !== undefined && state.mode === "study") return;
  state.picks[qi] = oi; persist();
  drawQuestion(); refreshChrome();
  if(state.mode === "exam") setTimeout(advance, 130);
}
function reveal_it(){
  var vis = visible();
  if(!vis.length || state.mode === "exam") return;
  var qi = vis[state.i];
  if(state.picks[qi] !== undefined || state.shown[qi]) return;
  state.shown[qi] = 1; persist();
  drawQuestion(); refreshChrome();
}
function advance(){
  var vis = visible();
  if(state.i < vis.length-1){ state.i++; drawQuestion(); refreshChrome(); toTop(); }
  else go("#"+state.bank+"/results");
}
function prev(){ if(state.i>0){ state.i--; drawQuestion(); refreshChrome(); toTop(); } }
function toTop(){
  var c = document.querySelector(".qbody");
  if(c && c.getBoundingClientRect().top < 0) window.scrollTo(0,0);
}

/* ── jump / settings panel ─────────────────────────────────────── */
function openPanel(){
  closePanel(true);
  state.panel = true;
  var b = BANKS[state.bank], vis = visible();
  var cells = vis.map(function(qi,n){
    var p = state.picks[qi], st = "";
    if(p!==undefined) st = state.mode==="exam" ? "done" : (p===b.q[qi].a ? "ok" : "no");
    else if(state.shown[qi] && state.mode!=="exam") st = "shown";
    return '<button class="cell" data-st="'+st+'" data-jump="'+n+'"'
      + (n===state.i?' aria-current="true"':'')+'>'+(qi+1)+'</button>';
  }).join("");
  var topics = topicsOf(b).map(function(t){
    return '<option value="'+esc(t)+'"'+(state.topic===t?" selected":"")+'>'+esc(t)+'</option>'; }).join("");

  var scrim = document.createElement("div"); scrim.className="scrim"; scrim.id="scrim";
  var panel = document.createElement("div"); panel.className="panel"; panel.id="panel";
  panel.innerHTML = '<div class="panel-in">'
    + '<div class="ph"><span class="eyebrow">Answer sheet &middot; '+vis.length+' questions</span>'
    + '<button class="x" id="p-close">Close &times;</button></div>'
    + '<div class="pset">'
    + '<select id="f-topic"><option value="*">All topics</option>'+topics+'</select>'
    + '<button id="t-mode" aria-pressed="'+(state.mode==="exam")+'">Exam mode</button>'
    + '<button id="t-shuffle">Shuffle</button>'
    + '<button id="t-results">Results</button>'
    + '<button id="t-reset">Clear</button>'
    + '<a href="'+WA+'" target="_blank" rel="noopener noreferrer">Report</a></div>'
    + '<div class="grid" id="grid">'+cells+'</div></div>';
  document.body.appendChild(scrim); document.body.appendChild(panel);

  scrim.onclick = function(){ closePanel(); };
  document.getElementById("p-close").onclick = function(){ closePanel(); };
  document.getElementById("f-topic").onchange = function(){
    state.topic = this.value; state.i = 0; closePanel(); renderQuiz(); window.scrollTo(0,0); };
  document.getElementById("t-mode").onclick = function(){
    state.mode = state.mode==="exam" ? "study" : "exam"; persist(); closePanel(); renderQuiz(); };
  document.getElementById("t-shuffle").onclick = function(){
    shuffle(state.order); state.i=0; closePanel(); renderQuiz(); window.scrollTo(0,0); };
  document.getElementById("t-results").onclick = function(){
    closePanel(); go("#"+state.bank+"/results"); };
  document.getElementById("t-reset").onclick = function(){
    if(confirm("Clear every answer in this bank?")){
      state.picks={}; state.shown={}; drop(state.bank); persist();
      state.i=0; closePanel(); renderQuiz(); } };
  document.getElementById("grid").onclick = function(e){
    var c = e.target.closest("[data-jump]"); if(!c) return;
    state.i = +c.dataset.jump; closePanel(); drawQuestion(); refreshChrome(); window.scrollTo(0,0); };
  var cur = panel.querySelector('[aria-current="true"]');
  if(cur && cur.scrollIntoView) cur.scrollIntoView({block:"center"});
}
function closePanel(silent){
  var s = document.getElementById("scrim"), p = document.getElementById("panel");
  if(s) s.remove(); if(p) p.remove();
  if(!silent) state.panel = false;
}

/* ── results ───────────────────────────────────────────────────── */
function renderResults(){
  closePanel();
  var b = BANKS[state.bank], vis = visible();
  document.body.setAttribute("data-view","quiz");
  document.documentElement.setAttribute("data-course", b.course);

  var right=0, wrong=0, skipped=0, asked=0, byTopic={}, misses=[];
  vis.forEach(function(i){
    var q=b.q[i], p=state.picks[i];
    if(!byTopic[q.t]) byTopic[q.t]={r:0,n:0};
    if(p===undefined){ if(state.shown[i]) asked++; else skipped++; return; }
    byTopic[q.t].n++;
    if(p===q.a){ right++; byTopic[q.t].r++; } else { wrong++; misses.push({q:q,p:p,i:i}); }
  });
  var answered = right+wrong, pct = answered ? Math.round(right/answered*100) : 0;
  var verdict = !answered ? "Nothing marked yet. Answer some questions and come back."
    : pct>=80 ? "Strong. Work the misses below, then move to the other bank."
    : pct>=60 ? "Solid base. The topic breakdown shows where the marks are leaking."
    : "Worth a second pass. Read the explanations on the misses before you re-run this bank.";

  var rows = Object.keys(byTopic).filter(function(t){ return byTopic[t].n; })
    .sort(function(a,c){ return (byTopic[a].r/byTopic[a].n)-(byTopic[c].r/byTopic[c].n); })
    .map(function(t){ var d=byTopic[t], p=Math.round(d.r/d.n*100);
      return '<div class="trow"><span class="nm">'+esc(t)+'</span>'
        + '<span class="tb"><i style="width:'+p+'%"></i></span>'
        + '<span class="sc">'+d.r+'/'+d.n+'</span></div>'; }).join("");

  var review = misses.slice(0,60).map(function(m){
    return '<div class="rv"><div class="q"><b>'+(m.i+1)+'.</b> '+mtxt(m.q.q)+'</div>'
      + '<div class="a yours"><span class="m">You</span><span>'+LET[m.p]+' &middot; '+mtxt(m.q.o[m.p])+'</span></div>'
      + '<div class="a right"><span class="m">Answer</span><span>'+LET[m.q.a]+' &middot; '+mtxt(m.q.o[m.q.a])+'</span></div>'
      + '<div class="a"><span class="m">Why</span><span>'+mtxt(m.q.w)+'</span></div>'
      + whenceHTML(m.q, m.i)+'</div>'; }).join("");

  app.innerHTML = '<div class="qpage">'
    + '<div class="qbar"><div class="qbar-in">'
    + '<button class="exit" data-home>&larr; Banks</button>'
    + '<span class="name">'+esc(b.title)+' &middot; result</span></div>'
    + '<div class="qprog"><i style="width:100%"></i></div></div>'
    + '<div class="qbody"><div class="col">'
    + '<section class="result"><span class="eyebrow">Result'
    + (state.topic==="*" ? "" : " &middot; "+esc(state.topic))+'</span>'
    + '<div class="pct">'+pct+'<span style="font-size:.4em">%</span></div>'
    + '<h2>'+right+' of '+answered+' correct</h2><p class="line">'+verdict+'</p>'
    + '<div class="stats">'
    + '<div class="stat"><div class="v ok">'+right+'</div><div class="l">Right</div></div>'
    + '<div class="stat"><div class="v no">'+wrong+'</div><div class="l">Wrong</div></div>'
    + '<div class="stat"><div class="v">'+skipped+'</div><div class="l">Unanswered</div></div>'
    + '<div class="stat"><div class="v">'+vis.length+'</div><div class="l">In this run</div></div></div>'
    + (rows ? '<span class="eyebrow">By topic &middot; weakest first</span><div class="bytopic">'+rows+'</div>' : '')
    + '</section>'
    + (review ? '<span class="eyebrow" style="display:block;margin:30px 0 0">What you missed</span>'
        + '<div class="review">'+review+'</div>' : '')
    + '</div></div>'
    + '<div class="qfoot"><div class="qfoot-in">'
    + '<button class="btn pri" id="r-back">Back to questions</button>'
    + '<button class="btn" id="r-retry">Retry shuffled</button>'
    + '<button class="btn" data-home>Banks</button></div></div></div>';

  document.getElementById("r-back").onclick = function(){ go("#"+state.bank); };
  document.getElementById("r-retry").onclick = function(){
    state.picks={}; state.shown={}; drop(state.bank); persist();
    shuffle(state.order); state.i=0; state.topic="*"; go("#"+state.bank); window.scrollTo(0,0); };
  window.scrollTo(0,0);
}

/* ── corrections ───────────────────────────────────────────────────
   Everything here is worked from the course materials by hand, so some of
   it will be wrong. The quickest way to hear about it is WhatsApp: the link
   opens the chat and leaves the message to the reader. */
var WA = "https://wa.me/2347061217361";

/* ── materials ─────────────────────────────────────────────────────
   Every question names the class, deck or lecturer block its answer was
   worked from. Those names are the keys of REF, so the label on the card
   is also the way into the document itself. */
function refsOf(q){
  return String(q && q.s || "").split("·").map(function(s){ return s.trim(); })
    .filter(function(s){ return s; });
}
/* wikipedia.org out of https://en.wikipedia.org/wiki/… , to say where a link goes */
function siteOf(url){
  var host = String(url).split("/")[2].replace(/^www\./, "").split(".");
  return host.length > 2 ? host.slice(1).join(".") : host.join(".");
}
function aimOf(qi, doc){
  var b = AIM[state.bank];
  var at = b && b[qi] && b[qi][doc];
  return at ? ' data-aim="'+at+'"' : "";
}
function srcHTML(q, qi){
  return refsOf(q).map(function(label){
    if(REF[label]) return '<button class="ref" data-doc="'+REF[label]+'"'
      + aimOf(qi, REF[label])+'>'+esc(label)+'</button>';
    if(LINKS[label]) return '<a class="ref" href="'+esc(LINKS[label])
      + '" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a>';
    return esc(label);
  }).join(" &middot; ");
}
/* The citation offered under a revealed answer: the document it was worked
   from, or a page on the web where the materials do not cover the point. The
   paper a question came from ("Examination") is neither, and stays as text. */
function whenceHTML(q, qi){
  var any = false;
  var cites = refsOf(q).map(function(label){
    var id = REF[label], url = LINKS[label];
    if(id){
      any = true;
      return '<button class="cite" data-doc="'+id+'"'+aimOf(qi, id)+'>'
        + '<span class="tag">'+esc(label)+'</span>'
        + '<span class="nm">'+esc(DOCS[id].title)+'</span></button>';
    }
    if(url){
      any = true;
      return '<a class="cite ext" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'
        + '<span class="tag">'+esc(siteOf(url))+'</span>'
        + '<span class="nm">'+esc(label)+'</span></a>';
    }
    return '<span class="plain">'+esc(label)+'</span>';
  }).join("");
  return any ? '<div class="whence"><span class="eyebrow">Source</span>'+cites+'</div>' : "";
}

function docOrder(){
  var out = [];
  SHELVES.forEach(function(s){ s.groups.forEach(function(g){ out = out.concat(g.ids); }); });
  return out;
}
/* The notes carry their worked examples as TeX, set by the same renderer the
   answer explanations use, so a formula looks the same wherever it appears. */
function unesc(s){
  return String(s).replace(/&lt;/g,"<").replace(/&gt;/g,">")
    .replace(/&quot;/g,'"').replace(/&amp;/g,"&");
}
function setMaths(html){
  return html
    .replace(/<span class="tex">([\s\S]*?)<\/span>/g, function(_, t){
      return mtex(unesc(t), true); })
    .replace(/<span class="tex-i">([\s\S]*?)<\/span>/g, function(_, t){
      return mtex(unesc(t), false); });
}
function partHTML(p){
  var body = setMaths(p.html).replace(/<table>/g, '<div class="tw"><table>')
                   .replace(/<\/table>/g, "</table></div>");
  var head = "";
  if(p.label || p.note){
    head = '<div class="phead">'
      + (p.label ? "<h2>"+esc(p.label)+"</h2>" : "")
      + (p.note ? "<p>"+esc(p.note)+"</p>" : "")
      + '<span class="file">'+esc(p.src)+"</span></div>";
  }
  return '<section class="part">'+head+'<div class="prose">'+body+"</div></section>";
}
function tocHTML(d){
  var items = [];
  d.parts.forEach(function(p){
    var top = p.toc.filter(function(t){ return t.lv === 2; });
    items = items.concat(top.length ? top
      : p.toc.filter(function(t){ return t.lv <= 3; }));
  });
  if(items.length < 4 || items.length > 60) return "";
  return '<nav class="toc"><span class="eyebrow">Contents</span><ul>'
    + items.map(function(t){
        return '<li><button data-scroll="'+t.id+'">'+esc(t.t)+"</button></li>"; }).join("")
    + "</ul></nav>";
}
function docHTML(d){
  return tocHTML(d) + d.parts.map(partHTML).join("");
}

function renderDoc(id, aim){
  closePanel();
  var d = DOCS[id], order = docOrder(), at = order.indexOf(id);
  state.view = "doc";
  document.body.setAttribute("data-view", "notes");
  document.documentElement.setAttribute("data-course", d.course);

  var step = function(n, txt){
    var o = order[n];
    return o ? '<button class="btn" data-go="notes/'+o+'">'+txt+"</button>" : "";
  };
  app.innerHTML = '<div class="wrap"><article class="doc">'
    + '<div class="dhead"><span class="eyebrow">'
    + '<button class="ref" data-go="notes">Materials</button> &nbsp;/&nbsp; '
    + esc(d.ref)+'</span><h1>'+esc(d.title)+"</h1>"
    + '<div class="dmeta"><span>'+esc(d.kicker)+"</span>"
    + "<span><b>"+d.words.toLocaleString()+"</b> words</span>"
    + (d.parts.length > 1 ? "<span><b>"+d.parts.length+"</b> sources</span>" : "")
    + "</div></div>"
    + docHTML(d)
    + '<div class="dfoot">'+step(at-1, "&larr; Previous")
    + '<a class="btn" href="'+WA+'" target="_blank" '
    + 'rel="noopener noreferrer">Report a correction</a>'
    + '<span class="sp"></span>'+step(at+1, "Next &rarr;")+"</div>"
    + "</article></div>";
  window.scrollTo(0, 0);
  if(aim) land(document.getElementById(aim), null);
}

/* Land on the passage the question was worked from, and say so quietly:
   a mark that fades, not a permanent highlight on someone else's words. */
function land(el, box){
  if(!el) return;
  var run = function(){
    var top = el.getBoundingClientRect().top;
    if(box) box.scrollTop += top - box.getBoundingClientRect().top - 58;
    else window.scrollTo(0, Math.max(0, top + window.pageYOffset - 84));
    el.classList.remove("aimed");
    void el.offsetWidth;
    el.classList.add("aimed");
  };
  if(window.requestAnimationFrame) requestAnimationFrame(run); else setTimeout(run, 30);
}

function renderNotes(){
  closePanel();
  state.view = "notes";
  document.body.setAttribute("data-view", "notes");
  document.documentElement.removeAttribute("data-course");
  var n = Object.keys(DOCS).length, words = 0;
  for(var k in DOCS) words += DOCS[k].words;

  var shelves = SHELVES.map(function(s){
    var count = 0;
    var groups = s.groups.map(function(g){
      count += g.ids.length;
      var rows = g.ids.map(function(id){
        var d = DOCS[id];
        return '<button class="docrow" data-go="notes/'+id+'">'
          + '<span class="ref">'+esc(d.ref)+"</span>"
          + '<span class="nm">'+esc(d.title)+"<em>"+esc(d.kicker)+"</em></span>"
          + '<span class="w">'+d.words.toLocaleString()+" w</span></button>";
      }).join("");
      return '<div class="group">'+esc(g.label)+'</div><div class="docs">'+rows+"</div>";
    }).join("");
    return '<section class="shelf" data-course="'+s.course+'">'
      + '<div class="sh"><span class="code">'+esc(s.code)+"</span><h2>"+esc(s.name)+"</h2>"
      + '<span class="n">'+count+" documents</span></div>"
      + '<p class="blurb">'+esc(s.note)+"</p>"
      + (s.course === "BUS" ? OUTLINE : "") + groups + "</section>";
  }).join("");

  app.innerHTML = '<div class="wrap"><section class="hero">'
    + '<span class="eyebrow">2025/26 course materials</span>'
    + "<h1>The notes the answers were worked from.</h1>"
    + "<p>Every class, deck and lecturer block behind the four question banks, "
    + "set as text you can read here. Nothing is summarised: this is what the "
    + "lecturers handed out, with the duplicates dropped and the handwritten "
    + "notes transcribed.</p>"
    + '<div class="tally"><span><b>'+n+"</b> documents</span>"
    + "<span><b>"+words.toLocaleString()+"</b> words</span>"
    + "<span><b>2</b> courses</span></div></section>"
    + '<div style="height:38px"></div>'+shelves+"</div>";

  document.getElementById("foot-note").textContent =
    "Transcribed and set as text from the 2025/26 CIL 524 and BUS 440 course folders. "
    + "Wording follows the source; layout does not. Where a lecturer's notes were "
    + "handwritten, what you are reading is a transcript of the photographs. "
    + "Check anything that matters against the original.";
  window.scrollTo(0, 0);
}

/* Reading a document without leaving the question you are on. */
function openReader(id, aim){
  var d = DOCS[id];
  if(!d) return;
  closePanel(true);
  state.panel = true;
  var scrim = document.createElement("div"); scrim.className = "scrim"; scrim.id = "scrim";
  var panel = document.createElement("div"); panel.className = "panel reader"; panel.id = "panel";
  panel.innerHTML = '<div class="panel-in">'
    + '<div class="rh"><span class="ref">'+esc(d.ref)+'</span>'
    + '<span class="nm">'+esc(d.title)+"</span>"
    + '<span class="acts"><a href="#notes/'+id+(aim ? "/"+aim : "")+'">Full page &rarr;</a>'
    + '<button class="x" id="p-close">Close &times;</button></span></div>'
    + docHTML(d)+"</div>";
  document.body.appendChild(scrim); document.body.appendChild(panel);
  scrim.onclick = function(){ closePanel(); };
  document.getElementById("p-close").onclick = function(){ closePanel(); };
  if(aim) land(document.getElementById(aim), panel.querySelector(".panel-in"));
}

/* ── theme ─────────────────────────────────────────────────────── */
var THEMES = ["system","light","dark"];
function applyTheme(t){
  if(t==="system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
  var btn = document.getElementById("theme-btn");
  if(btn) btn.textContent = t==="system" ? "Theme · auto" : "Theme · "+t;
  save("theme", t);
}
document.getElementById("theme-btn").onclick = function(){
  var cur = load("theme") || "system";
  applyTheme(THEMES[(THEMES.indexOf(cur)+1)%THEMES.length]);
};

/* ── wiring ────────────────────────────────────────────────────── */
document.getElementById("home-btn").onclick = function(){ go("#"); };
document.getElementById("notes-btn").onclick = function(){ go("#notes"); window.scrollTo(0,0); };
app.addEventListener("click", function(e){
  var d = e.target.closest("[data-doc]");
  /* From a question the material opens over the page, so the place you had
     reached in the bank is still there behind it. */
  if(d){
    var at = d.dataset.aim || "";
    if(state.view === "quiz") openReader(d.dataset.doc, at);
    else go("#notes/"+d.dataset.doc+(at ? "/"+at : ""));
    return;
  }
  var g = e.target.closest("[data-go]");
  if(g){ go("#"+g.dataset.go); window.scrollTo(0,0); return; }
  if(e.target.closest("[data-home]")){ go("#"); window.scrollTo(0,0); }
});
document.addEventListener("click", function(e){
  var s = e.target.closest("[data-scroll]");
  if(!s) return;
  var el = document.getElementById(s.dataset.scroll);
  if(el && el.scrollIntoView) el.scrollIntoView({block:"start", behavior:"smooth"});
});
document.addEventListener("keydown", function(e){
  if(e.metaKey||e.ctrlKey||e.altKey) return;
  var tag = document.activeElement ? document.activeElement.tagName : "";
  if(/^(INPUT|SELECT|TEXTAREA)$/.test(tag)) return;
  var k = e.key.toLowerCase();
  if(k==="escape"){
    if(state.panel) closePanel();
    else if(state.view === "doc") go("#notes");
    else go("#");
    return;
  }
  if(state.view !== "quiz") return;
  if(state.panel) return;
  var vis = visible(), q = vis.length ? BANKS[state.bank].q[vis[state.i]] : null;
  var li = LET.map(function(l){return l.toLowerCase();}).indexOf(k);
  if(li===-1 && k>="1" && k<="6") li = +k-1;
  if(li>-1 && q && li<q.o.length){ e.preventDefault(); choose(li); return; }
  if(k==="s"){ e.preventDefault(); reveal_it(); return; }
  if(k==="arrowright"||k==="enter"){ e.preventDefault(); advance(); }
  else if(k==="arrowleft"){ e.preventDefault(); prev(); }
  else if(k==="j"){ e.preventDefault(); openPanel(); }
});

document.getElementById("foot-wa").href = WA;

applyTheme(load("theme") || "system");
route();
})();
