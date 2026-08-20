(function(){
"use strict";
var LET = ["A","B","C","D","E","F"];
var ORDER = ["cil-pq","bus-pq","cil-new","bus-new"];
var app = document.getElementById("app");
var state = { view:"home", bank:null, i:0, order:[], picks:{}, mode:"study", topic:"*" };

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
  var p = load(id);
  if(!p || !p.picks) return {done:0, right:0, total:BANKS[id].q.length};
  var done=0, right=0;
  for(var k in p.picks){ done++; if(p.picks[k] === BANKS[id].q[k].a) right++; }
  return {done:done, right:right, total:BANKS[id].q.length};
}

/* ── helpers ───────────────────────────────────────────────────── */
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function el(html){ var t=document.createElement("template"); t.innerHTML=html.trim(); return t.content.firstElementChild; }
function topicsOf(b){ var seen={}, out=[]; b.q.forEach(function(q){ if(!seen[q.t]){ seen[q.t]=1; out.push(q.t); } }); return out; }

/* ── home ──────────────────────────────────────────────────────── */
function renderHome(){
  document.documentElement.removeAttribute("data-course");
  var total = ORDER.reduce(function(n,id){ return n + BANKS[id].q.length; }, 0);
  var pq = BANKS["cil-pq"].q.length + BANKS["bus-pq"].q.length;

  var cards = ORDER.map(function(id){
    var b = BANKS[id], p = progressOf(id);
    var pct = p.done ? Math.round(p.done/p.total*100) : 0;
    return '<button class="card" data-course="'+b.course+'" data-go="'+id+'">'
      + '<div class="top-row"><span class="code">'+esc(b.course)+' '+(b.course==="CIL"?"524":"440")+'</span>'
      + '<span class="kind">'+(b.kind==="pq"?"Past paper":"New material")+'</span></div>'
      + '<h2>'+esc(b.title)+'</h2>'
      + '<p class="sub">'+esc(b.subtitle)+'</p>'
      + '<div class="foot"><span class="n">'+b.q.length+'</span> questions'
      + (p.done ? '<span>· '+p.done+' answered · '+Math.round(p.right/p.done*100)+'% right</span>' : '')
      + '<span class="go">Open &rarr;</span></div>'
      + '<div class="bar"><span style="width:'+pct+'%"></span></div></button>';
  }).join("");

  app.innerHTML =
    '<div class="wrap"><section class="hero">'
    + '<span class="eyebrow">University of Lagos · 400 level engineering</span>'
    + '<h1>Two courses, four question banks, one answer sheet.</h1>'
    + '<p>Every past question from the CIL 524 and BUS 440 papers, worked and explained &mdash; '
    + 'plus fresh questions written in the same style from the 2025/26 lectures, slides and class notes. '
    + 'Shade an answer and the reasoning appears underneath.</p>'
    + '<div class="tally"><span><b>'+total+'</b> questions</span><span><b>'+pq+'</b> from past papers</span>'
    + '<span><b>'+(total-pq)+'</b> newly written</span><span><b>2</b> courses</span></div>'
    + '</section>'
    + '<div class="deck">'+cards+'</div>'
    + '<section class="legend">'
    + '<div><h3>Past papers</h3><p>CIL 524 is the 2021/22 examination, with the answers taken from a marked script. '
    + 'BUS 440 is the 2024/25 continuous assessment and examination; that paper carries no answer key, so every answer '
    + 'here is <b>worked from the course materials</b> and the arithmetic is shown.</p></div>'
    + '<div><h3>Where a question is broken</h3><p>Some questions on both papers are defective &mdash; duplicated options, '
    + 'a stem that contradicts its own choices, an answer the lecture notes disagree with. Those carry a '
    + '<b>check this</b> note explaining the conflict rather than quietly picking a side.</p></div>'
    + '<div><h3>New material</h3><p>The practice banks follow the 2025/26 syllabus: Classes 1&ndash;9 and the three slide '
    + 'decks for CIL, and the <b>six lecturer blocks</b> of the BUS course outline &mdash; inventory, management theory, '
    + 'TQM, leadership, quality control and project management.</p></div>'
    + '<div><h3>Working</h3><p>Answers save as you go, so you can leave and come back. Shuffle to break the order you '
    + 'have memorised, filter to a single topic, or switch to <b>exam mode</b> to sit a bank straight through with no '
    + 'feedback until you finish.</p></div>'
    + '</section></div>';

  document.getElementById("foot-note").textContent =
    "Built from the CIL 524 and BUS 440 course folders. Past questions are transcribed as printed, including their typographical errors. Answers and explanations are study aids, not an official marking scheme — check anything that matters against your lecturer.";
}

/* ── quiz ──────────────────────────────────────────────────────── */
function openBank(id, opts){
  var b = BANKS[id];
  state.bank = id; state.view = "quiz";
  var saved = load(id) || {};
  state.picks = (opts && opts.reset) ? {} : (saved.picks || {});
  state.mode  = saved.mode || "study";
  state.topic = "*";
  state.order = b.q.map(function(_,i){ return i; });
  if(opts && opts.shuffle) shuffle(state.order);
  state.i = 0;
  if(!(opts && opts.reset)){
    for(var k=0;k<state.order.length;k++){ if(state.picks[state.order[k]] === undefined){ state.i = k; break; } }
  }
  persist(); renderQuiz();
}
function shuffle(a){ for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } }
function persist(){ save(state.bank, {picks:state.picks, mode:state.mode}); }

function visible(){
  if(state.topic === "*") return state.order;
  var b = BANKS[state.bank];
  return state.order.filter(function(i){ return b.q[i].t === state.topic; });
}

function renderQuiz(){
  var b = BANKS[state.bank];
  document.documentElement.setAttribute("data-course", b.course);
  var vis = visible();
  if(state.i >= vis.length) state.i = Math.max(0, vis.length-1);

  app.innerHTML = '<div class="wrap"><div class="quiz">'
    + '<aside class="sheet" id="sheet"></aside>'
    + '<div class="main" id="main"></div></div></div>';
  document.getElementById("foot-note").textContent =
    b.title + " — " + b.subtitle + ". Keyboard: A–E to shade, ← → to move, Enter for next.";
  drawSheet(); drawQuestion();
}

function drawSheet(){
  var b = BANKS[state.bank], vis = visible();
  var done=0, right=0, wrong=0;
  vis.forEach(function(i){ var p=state.picks[i]; if(p!==undefined){ done++; if(p===b.q[i].a) right++; else wrong++; } });

  var cells = vis.map(function(qi, n){
    var p = state.picks[qi], st = "";
    if(p !== undefined) st = (state.mode==="exam") ? "done" : (p===b.q[qi].a ? "ok" : "no");
    return '<button class="cell" data-st="'+st+'" data-jump="'+n+'" '
      + (n===state.i?'aria-current="true" ':'') + 'title="Question '+(qi+1)+'">'+(qi+1)+'</button>';
  }).join("");

  var opts = topicsOf(b).map(function(t){
    return '<option value="'+esc(t)+'"'+(state.topic===t?" selected":"")+'>'+esc(t)+'</option>'; }).join("");

  document.getElementById("sheet").innerHTML =
      '<div class="hd"><span class="eyebrow">Answer sheet</span>'
    + '<span class="score">'+done+'/'+vis.length+'</span></div>'
    + '<div class="instr">'+(state.mode==="exam"
        ? "Exam mode · marks withheld until you finish"
        : "Shade the appropriate answer")+'</div>'
    + '<div class="grid" id="grid">'+cells+'</div>'
    + '<div class="tools">'
    + '<select class="tool" id="f-topic"><option value="*">All topics &mdash; '+b.q.length+'</option>'+opts+'</select>'
    + '<button class="tool" id="t-mode">'+(state.mode==="exam"?"Study mode":"Exam mode")+'<span class="k">M</span></button>'
    + '<button class="tool" id="t-shuffle">Shuffle<span class="k">S</span></button>'
    + '<button class="tool" id="t-finish">'+(state.mode==="exam"?"Finish &amp; mark":"See results")+'</button>'
    + '<button class="tool" id="t-reset">Clear answers</button>'
    + '</div>';

  document.getElementById("f-topic").onchange = function(){ state.topic=this.value; state.i=0; renderQuiz(); };
  document.getElementById("t-mode").onclick = function(){
    state.mode = state.mode==="exam" ? "study" : "exam"; persist(); renderQuiz(); };
  document.getElementById("t-shuffle").onclick = function(){ shuffle(state.order); state.i=0; renderQuiz(); };
  document.getElementById("t-finish").onclick = showResults;
  document.getElementById("t-reset").onclick = function(){
    if(confirm("Clear every answer in this bank?")){ state.picks={}; drop(state.bank); persist(); state.i=0; renderQuiz(); } };
  var g = document.getElementById("grid");
  if(g.scrollHeight <= g.clientHeight + 2) g.classList.add("short");
  g.onclick = function(e){
    var c = e.target.closest("[data-jump]"); if(!c) return;
    state.i = +c.dataset.jump; drawSheet(); drawQuestion(); };
  var cur = g.querySelector('[aria-current="true"]');
  if(cur && cur.scrollIntoView) cur.scrollIntoView({block:"nearest"});
}

function drawQuestion(){
  var b = BANKS[state.bank], vis = visible();
  if(!vis.length){ document.getElementById("main").innerHTML =
    '<div class="crumb"><button class="back" data-home>&larr; All banks</button></div>'
    + '<div class="qcard"><div class="stem">No questions in this topic.</div></div>'; return; }

  var qi = vis[state.i], q = b.q[qi], pick = state.picks[qi];
  var reveal = pick !== undefined && state.mode === "study";

  var opts = q.o.map(function(text, oi){
    var st = "";
    if(reveal){ if(oi === q.a) st="ok"; else if(oi === pick) st="no"; }
    else if(pick === oi) st="pick";
    var tag = st==="ok" ? '<span class="tag">Correct</span>'
            : st==="no" ? '<span class="tag">Your answer</span>' : '';
    return '<button class="opt" data-st="'+st+'" data-pick="'+oi+'"'+(reveal?' disabled':'')+'>'
      + '<span class="bub">'+LET[oi]+'</span><span class="txt">'+esc(text)+'</span>'+tag+'</button>';
  }).join("");

  var why = "";
  if(reveal){
    why = '<div class="why"><div class="eyebrow lbl">'
      + (pick===q.a ? "Correct" : "The answer is "+LET[q.a]) + '</div>'
      + (q.w ? '<p>'+esc(q.w)+'</p>' : '<p>&mdash;</p>')
      + (q.calc ? '<div class="calc">'+esc(q.calc)+'</div>' : '')
      + (q.flag ? '<div class="flag"><b>Check this</b>'+esc(q.flag)+'</div>' : '')
      + '</div>';
  }

  document.getElementById("main").innerHTML =
      '<div class="crumb"><button class="back" data-home>&larr; All banks</button>'
    + '<span class="t">'+esc(q.t)+'</span></div>'
    + '<article class="qcard">'
    + '<div class="qhead"><span class="qnum">'+(qi+1)+'</span>'
    + '<span class="qsrc">'+esc(q.s || b.title)+'</span></div>'
    + '<div class="stem">'+esc(q.q)+'</div>'
    + '<div class="opts" id="opts">'+opts+'</div>'
    + why + '</article>'
    + '<div class="nav">'
    + '<button class="btn" id="prev"'+(state.i===0?" disabled":"")+'>&larr; Prev</button>'
    + '<button class="btn pri" id="next">'+(state.i===vis.length-1?"Finish":"Next &rarr;")+'</button>'
    + '<span class="pos">'+(state.i+1)+' of '+vis.length+'</span></div>';

  document.getElementById("opts").onclick = function(e){
    var o = e.target.closest("[data-pick]"); if(!o || o.disabled) return; choose(+o.dataset.pick); };
  document.getElementById("prev").onclick = function(){ if(state.i>0){ state.i--; drawSheet(); drawQuestion(); } };
  document.getElementById("next").onclick = advance;
}

function choose(oi){
  var vis = visible(); if(!vis.length) return;
  var qi = vis[state.i];
  if(state.picks[qi] !== undefined && state.mode === "study") return;
  state.picks[qi] = oi; persist(); drawSheet(); drawQuestion();
  if(state.mode === "exam") setTimeout(advance, 140);
}
function advance(){
  var vis = visible();
  if(state.i < vis.length-1){ state.i++; drawSheet(); drawQuestion(); window.scrollTo({top:0,behavior:"smooth"}); }
  else showResults();
}

/* ── results ───────────────────────────────────────────────────── */
function showResults(){
  var b = BANKS[state.bank], vis = visible();
  var right=0, wrong=0, skipped=0, byTopic={}, misses=[];
  vis.forEach(function(i){
    var q=b.q[i], p=state.picks[i];
    if(!byTopic[q.t]) byTopic[q.t]={r:0,n:0};
    if(p===undefined){ skipped++; return; }
    byTopic[q.t].n++;
    if(p===q.a){ right++; byTopic[q.t].r++; } else { wrong++; misses.push({q:q,p:p,i:i}); }
  });
  var answered = right + wrong;
  var pct = answered ? Math.round(right/answered*100) : 0;
  var verdict = !answered ? "Nothing marked yet."
    : pct>=80 ? "Strong. Work the misses below and move to the other bank."
    : pct>=60 ? "Solid base. The topic breakdown shows where the marks are leaking."
    : "Worth a second pass — read the explanations on the misses before you re-run this bank.";

  var rows = Object.keys(byTopic).filter(function(t){ return byTopic[t].n; })
    .sort(function(a,c){ return (byTopic[a].r/byTopic[a].n) - (byTopic[c].r/byTopic[c].n); })
    .map(function(t){ var d=byTopic[t], p=Math.round(d.r/d.n*100);
      return '<div class="trow"><span class="nm">'+esc(t)+'</span>'
        + '<span class="tb"><i style="width:'+p+'%"></i></span>'
        + '<span class="sc">'+d.r+'/'+d.n+'</span></div>'; }).join("");

  var review = misses.slice(0,60).map(function(m){
    return '<div class="rv"><div class="q"><b>'+(m.i+1)+'.</b> '+esc(m.q.q)+'</div>'
      + '<div class="a yours"><span class="m">You</span><span>'+LET[m.p]+' &mdash; '+esc(m.q.o[m.p])+'</span></div>'
      + '<div class="a right"><span class="m">Answer</span><span>'+LET[m.q.a]+' &mdash; '+esc(m.q.o[m.q.a])+'</span></div>'
      + (m.q.w ? '<div class="a"><span class="m">Why</span><span>'+esc(m.q.w)+'</span></div>' : '')
      + '</div>'; }).join("");

  app.innerHTML = '<div class="wrap" style="padding-top:26px;padding-bottom:80px">'
    + '<div class="crumb"><button class="back" data-home>&larr; All banks</button>'
    + '<span class="t">'+esc(b.title)+'</span></div>'
    + '<section class="result"><span class="eyebrow">Result'+(state.topic==="*"?"":" · "+esc(state.topic))+'</span>'
    + '<div class="pct">'+pct+'<span style="font-size:.42em">%</span></div>'
    + '<h2>'+right+' of '+answered+' correct</h2>'
    + '<p class="line">'+verdict+'</p>'
    + '<div class="stats">'
    + '<div class="stat"><div class="v ok">'+right+'</div><div class="l">Right</div></div>'
    + '<div class="stat"><div class="v no">'+wrong+'</div><div class="l">Wrong</div></div>'
    + '<div class="stat"><div class="v">'+skipped+'</div><div class="l">Unanswered</div></div>'
    + '<div class="stat"><div class="v">'+vis.length+'</div><div class="l">In this run</div></div>'
    + '</div>'
    + (rows ? '<span class="eyebrow">By topic &mdash; weakest first</span><div class="bytopic" style="margin-top:10px">'+rows+'</div>' : '')
    + '<div class="nav" style="margin-top:0">'
    + '<button class="btn pri" id="r-back">Back to questions</button>'
    + '<button class="btn" id="r-retry">Retry this bank</button>'
    + '<button class="btn" data-home>All banks</button></div>'
    + '</section>'
    + (review ? '<span class="eyebrow" style="display:block;margin:34px 0 10px">What you missed</span>'
        + '<div class="review">'+review+'</div>' : '');

  document.getElementById("r-back").onclick = function(){ renderQuiz(); window.scrollTo(0,0); };
  document.getElementById("r-retry").onclick = function(){ openBank(state.bank,{reset:true, shuffle:true}); window.scrollTo(0,0); };
  window.scrollTo(0,0);
}

/* ── theme ─────────────────────────────────────────────────────── */
var THEMES = ["system","light","dark"];
function applyTheme(t){
  if(t === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
  var btn = document.getElementById("theme-btn");
  btn.textContent = t === "system" ? "Theme · auto" : "Theme · " + t;
  save("theme", t);
}
document.getElementById("theme-btn").onclick = function(){
  var cur = load("theme") || "system";
  applyTheme(THEMES[(THEMES.indexOf(cur)+1) % THEMES.length]);
};

/* ── wiring ────────────────────────────────────────────────────── */
function goHome(){ state.view="home"; state.bank=null; renderHome(); window.scrollTo(0,0); }
document.getElementById("home-btn").onclick = goHome;
app.addEventListener("click", function(e){
  var go = e.target.closest("[data-go]");
  if(go){ openBank(go.dataset.go); window.scrollTo(0,0); return; }
  if(e.target.closest("[data-home]")) goHome();
});
document.addEventListener("keydown", function(e){
  if(e.metaKey || e.ctrlKey || e.altKey) return;
  if(/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
  if(state.view !== "quiz") return;
  var k = e.key.toLowerCase();
  var li = LET.map(function(l){ return l.toLowerCase(); }).indexOf(k);
  if(li === -1 && k >= "1" && k <= "6") li = +k - 1;
  var vis = visible(), q = vis.length ? BANKS[state.bank].q[vis[state.i]] : null;
  if(li > -1 && q && li < q.o.length){ e.preventDefault(); choose(li); return; }
  if(k === "arrowright"){ e.preventDefault(); advance(); }
  else if(k === "arrowleft" && state.i > 0){ e.preventDefault(); state.i--; drawSheet(); drawQuestion(); }
  else if(k === "enter"){ e.preventDefault(); advance(); }
  else if(k === "s"){ shuffle(state.order); state.i=0; renderQuiz(); }
  else if(k === "m"){ state.mode = state.mode==="exam"?"study":"exam"; persist(); renderQuiz(); }
  else if(k === "escape"){ goHome(); }
});

applyTheme(load("theme") || "system");
goHome();
})();
