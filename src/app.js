(function(){
"use strict";
var LET = ["A","B","C","D","E","F"];
var ORDER = ["cil-pq","bus-pq","cil-new","bus-new"];
var app = document.getElementById("app");
var state = { view:"home", bank:null, i:0, order:[], picks:{}, mode:"study", topic:"*", panel:false };

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
function persist(){ save(state.bank, {picks:state.picks, mode:state.mode}); }
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
  if(BANKS[id]){
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
    + '<section class="legend">'
    + '<div><h3>Where the answers come from</h3><p>Every answer on both papers is worked from the '
    + '<b>2025/26 course materials</b>: Classes 1&ndash;9 and the slide decks for CIL, the six '
    + 'lecturer blocks for BUS. Every CIL question carries the class or slide it rests on; the BUS '
    + 'practice questions carry the lecturer block, and the BUS past questions the paper they came from.</p></div>'
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
    + '<button class="btn" id="jump">Jump</button>'
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
      + 'Open <b>Jump</b> and choose another.</div></div>';
    document.getElementById("prev").disabled = true;
    return;
  }
  var qi = vis[state.i], q = b.q[qi], pick = state.picks[qi];
  var reveal = pick !== undefined && state.mode === "study";

  var opts = q.o.map(function(text, oi){
    var st = "";
    if(reveal){ if(oi===q.a) st="ok"; else if(oi===pick) st="no"; }
    else if(pick===oi) st="pick";
    var tag = st==="ok" ? '<span class="tag">Correct</span>'
            : st==="no" ? '<span class="tag">Your answer</span>' : '';
    return '<button class="opt" data-st="'+st+'" data-pick="'+oi+'"'+(reveal?' disabled':'')+'>'
      + '<span class="bub">'+LET[oi]+'</span><span class="txt">'+esc(text)+'</span>'+tag+'</button>';
  }).join("");

  var why = "";
  if(reveal){
    why = '<div class="why"><span class="eyebrow">'
      + (pick===q.a ? "Correct" : "The answer is "+LET[q.a]) + '</span>'
      + '<p>'+esc(q.w)+'</p>'
      + (q.calc ? '<div class="calc">'+esc(q.calc)+'</div>' : '')
      + (q.flag ? '<div class="flag"><b>Check this</b>'+esc(q.flag)+'</div>' : '')
      + '</div>';
  }

  col.innerHTML = '<article class="qcard">'
    + '<div class="qhead"><span class="qnum">'+(qi+1)+'</span>'
    + '<span class="qtopic">'+esc(q.t)+'</span>'
    + '<span class="qsrc">'+esc(q.s || "")+'</span></div>'
    + '<div class="stem">'+esc(q.q)+'</div>'
    + '<div class="opts" id="opts">'+opts+'</div>' + why + '</article>';

  document.getElementById("opts").onclick = function(e){
    var o = e.target.closest("[data-pick]"); if(!o || o.disabled) return; choose(+o.dataset.pick); };
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
    + '<button id="t-reset">Clear</button></div>'
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
      state.picks={}; drop(state.bank); persist(); state.i=0; closePanel(); renderQuiz(); } };
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

  var right=0, wrong=0, skipped=0, byTopic={}, misses=[];
  vis.forEach(function(i){
    var q=b.q[i], p=state.picks[i];
    if(!byTopic[q.t]) byTopic[q.t]={r:0,n:0};
    if(p===undefined){ skipped++; return; }
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
    return '<div class="rv"><div class="q"><b>'+(m.i+1)+'.</b> '+esc(m.q.q)+'</div>'
      + '<div class="a yours"><span class="m">You</span><span>'+LET[m.p]+' &middot; '+esc(m.q.o[m.p])+'</span></div>'
      + '<div class="a right"><span class="m">Answer</span><span>'+LET[m.q.a]+' &middot; '+esc(m.q.o[m.q.a])+'</span></div>'
      + '<div class="a"><span class="m">Why</span><span>'+esc(m.q.w)+'</span></div></div>'; }).join("");

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
    state.picks={}; drop(state.bank); persist();
    shuffle(state.order); state.i=0; state.topic="*"; go("#"+state.bank); window.scrollTo(0,0); };
  window.scrollTo(0,0);
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
app.addEventListener("click", function(e){
  var g = e.target.closest("[data-go]");
  if(g){ go("#"+g.dataset.go); window.scrollTo(0,0); return; }
  if(e.target.closest("[data-home]")){ go("#"); window.scrollTo(0,0); }
});
document.addEventListener("keydown", function(e){
  if(e.metaKey||e.ctrlKey||e.altKey) return;
  var tag = document.activeElement ? document.activeElement.tagName : "";
  if(/^(INPUT|SELECT|TEXTAREA)$/.test(tag)) return;
  var k = e.key.toLowerCase();
  if(k==="escape"){ if(state.panel){ closePanel(); } else { go("#"); } return; }
  if(state.view !== "quiz") return;
  if(state.panel) return;
  var vis = visible(), q = vis.length ? BANKS[state.bank].q[vis[state.i]] : null;
  var li = LET.map(function(l){return l.toLowerCase();}).indexOf(k);
  if(li===-1 && k>="1" && k<="6") li = +k-1;
  if(li>-1 && q && li<q.o.length){ e.preventDefault(); choose(li); return; }
  if(k==="arrowright"||k==="enter"){ e.preventDefault(); advance(); }
  else if(k==="arrowleft"){ e.preventDefault(); prev(); }
  else if(k==="j"){ e.preventDefault(); openPanel(); }
});

applyTheme(load("theme") || "system");
route();
})();
