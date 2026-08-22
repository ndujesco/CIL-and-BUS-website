"""Where in a document a question is answered.

A citation that drops the reader at the top of a 10,000-word note has only
half-answered "where can I read more". So every question is matched, at build
time, against the sections of the document it cites, and the winning section's
anchor is shipped alongside the banks. The reader opens there.

Matching is plain retrieval: the words of the stem, its correct option and its
explanation, scored against each section of that document by inverse document
frequency *within that document*, so a word that is everywhere in the note
counts for little and a word that appears in one section counts for a lot.
Length is discounted, or the longest section would win every time.
"""

import html
import json
import math
import re
import subprocess

STOP = set("""a an the of and or to in is are be was were for on with as that this these those it its
by from at not no all any one two both which what who whom whose when where how why can may might must
should would could will shall do does did done have has had been being if then than so such other others
following except only also more most less least same different type types kind kinds use used using uses
purpose main major minor best worst good bad true false correct incorrect answer question option options
above below into out over under between among during before after each every some none nothing their
there they them his her you your we our us within without upon while because since about against
example examples e.g eg ie etc""".split())

WORD = re.compile(r"[a-z][a-z\-']+")
HEAD = re.compile(r'<h([234])(?: id="([^"]+)")?>(.*?)</h\1>', re.S)
BLOCK = re.compile(
    r'<h([234]) id="([^"]+)">(.*?)</h\1>'
    r'|<(p|li) id="([^"]+)">(.*?)</\4>'
    r'|<div class="eqn" id="([^"]+)">(.*?)</div>', re.S)
TAGS = re.compile(r"<[^>]+>")


def words(text):
    return [w for w in WORD.findall(text.lower()) if w not in STOP and len(w) > 3]


def terms(text):
    ws = words(text)
    out = {}
    for w in ws:
        out[w] = out.get(w, 0) + 1
    for i in range(len(ws) - 1):
        b = ws[i] + " " + ws[i + 1]
        out[b] = out.get(b, 0) + 1
    return out


def plain(fragment):
    return html.unescape(TAGS.sub(" ", fragment))


def sections(doc):
    """[(anchor, heading, text)] — a document cut at its headings."""
    out = []
    for part in doc["parts"]:
        body = part["html"]
        marks = list(HEAD.finditer(body))
        if not marks or marks[0].start() > 0:
            head = plain(body[:marks[0].start()] if marks else body)
            if head.strip():
                out.append((None, part.get("label", ""), head))
        for n, m in enumerate(marks):
            end = marks[n + 1].start() if n + 1 < len(marks) else len(body)
            out.append((m.group(2), plain(m.group(3)),
                        plain(m.group(3)) + " " + plain(body[m.end():end])))
    return out


def lines(doc):
    """[(anchor, text, section_anchor)] — every paragraph, item and equation."""
    out = []
    for part in doc["parts"]:
        sec = None
        for m in BLOCK.finditer(part["html"]):
            if m.group(2):
                sec = m.group(2)
            elif m.group(5):
                out.append((m.group(5), plain(m.group(6)), sec))
            elif m.group(7):
                out.append((m.group(7), plain(m.group(8)), sec))
    return out


class Index:
    """One document, cut into sections and ready to be searched."""

    def __init__(self, doc):
        self.secs = [(a, h, terms(t), len(words(t)), terms(h))
                     for a, h, t in sections(doc)]
        self.lines = [(a, terms(t), len(words(t)), s) for a, t, s in lines(doc)]
        self.df = {}
        for sec in self.secs:
            ts = sec[2]
            for t in ts:
                self.df[t] = self.df.get(t, 0) + 1
        self.n = max(1, len(self.secs))

    def line(self, query, section, floor=3.0):
        """The line within a section that answers the question, if one stands out.

        Short lines are held to a higher bar: landing on a three-word bullet
        says less than landing on the paragraph that explains it."""
        q, best, second = terms(query), None, 0.0
        for anchor, ts, size, sec in self.lines:
            if sec != section or size < 4:
                continue
            s = 0.0
            for t in q:
                c = ts.get(t)
                if not c:
                    continue
                idf = math.log(1 + self.n / self.df.get(t, self.n))
                s += idf * min(c, 2) * (2.2 if " " in t else 1.0)
            s /= math.log(6 + size)
            if size < 12:
                s *= 0.75
            if not best or s > best[0]:
                second = best[0] if best else second
                best = (s, anchor)
            elif s > second:
                second = s
        return best[1] if best and best[0] >= floor else None

    def best(self, query):
        q, scored = terms(query), []
        for anchor, head, ts, size, hts in self.secs:
            if not anchor:
                continue
            s = 0.0
            for t, qn in q.items():
                c = ts.get(t)
                if not c:
                    continue
                idf = math.log(1 + self.n / self.df.get(t, self.n))
                s += idf * min(c, 3) * (1.8 if " " in t else 1.0)
                # the heading is the section's own summary: a hit there counts
                if t in hts:
                    s += idf * 3.0
            if s:
                scored.append((s / math.log(12 + size), anchor, head))
        if not scored:
            return None
        scored.sort(reverse=True)
        return scored[0]


def load_banks(root):
    """The banks are JavaScript; node reads them for us."""
    js = ('var BANKS={};'
          + ''.join('eval(require("fs").readFileSync(%s,"utf8"));' % json.dumps(
              root + "/src/" + f)
              for f in ("bank-cil-pq.js", "bank-bus-pq.js",
                        "bank-cil-new.js", "bank-bus-new.js"))
          + 'var o={};Object.keys(BANKS).forEach(function(k){'
            'o[k]=BANKS[k].q.map(function(q){return {t:q.t,s:q.s,q:q.q,'
            'o:q.o,a:q.a,w:q.w||""};});});'
            'process.stdout.write(JSON.stringify(o));')
    out = subprocess.run(["node", "-e", js], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def aim(root, docs, ref, floor=6.0):
    """{bank: [ {doc: anchor} | null, … ]} — one entry per question."""
    banks = load_banks(root)
    index = {k: Index(v) for k, v in docs.items()}
    out, hit, total, exact = {}, 0, 0, 0

    for bank, qs in banks.items():
        rows = []
        for q in qs:
            targets = {}
            labels = [p.strip() for p in str(q.get("s") or "").split("·")]
            for label in labels:
                doc_id = ref.get(label)
                if not doc_id or doc_id in targets:
                    continue
                total += 1
                query = " ".join([q["q"], q["o"][q["a"]] if q["o"] else "",
                                  q.get("w", ""), q.get("t", "")])
                found = index[doc_id].best(query)
                if found and found[0] >= floor:
                    line = index[doc_id].line(query, found[1])
                    targets[doc_id] = line or found[1]
                    hit += 1
                    if line:
                        exact += 1
            rows.append(targets or None)
        out[bank] = rows
    return out, hit, total, exact
