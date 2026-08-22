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

import corrections

STOP = set("""a an the of and or to in is are be was were for on with as that this these those it its
by from at not no all any one two both which what who whom whose when where how why can may might must
should would could will shall do does did done have has had been being if then than so such other others
following except only also more most less least same different type types kind kinds use used using uses
purpose main major minor best worst good bad true false correct incorrect answer question option options
above below into out over under between among during before after each every some none nothing their
there they them his her you your we our us within without upon while because since about against
example examples e.g eg ie etc""".split())

WORD = re.compile(r"[a-z][a-z\-']+|\d[\d,.]*")
HEAD = re.compile(r'<h([234])(?: id="([^"]+)")?>(.*?)</h\1>', re.S)
BLOCK = re.compile(
    r'<h([234]) id="([^"]+)">(.*?)</h\1>'
    r'|<(p|li|blockquote|pre) id="([^"]+)">(.*?)</\4>'
    r'|<div class="eqn" id="([^"]+)">(.*?)</div>', re.S)
TAGS = re.compile(r"<[^>]+>")


def words(text):
    out = []
    for w in WORD.findall(text.lower()):
        if w[0].isdigit():
            w = w.rstrip(".,").replace(",", "")
            if len(w) >= 2:                   # 2.06, 5856, 32 — but not "3"
                out.append(w)
        elif w not in STOP and len(w) > 3:
            out.append(w)
    return out


def stem(w):
    """Enough of a stemmer for "mere/merely", "represent/representations"."""
    for suf in ("ations", "ation", "ingly", "ing", "edly", "ed", "ly", "es", "s"):
        if w.endswith(suf) and len(w) - len(suf) >= 4:
            return w[:-len(suf)]
    return w


def stems(text):
    return set(stem(w) for w in words(text))


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


# "which of these is NOT…", "all except…": the answer is the one the notes do
# not contain, so leading with it would aim at nothing, or at the wrong thing
ODD_ONE_OUT = re.compile(r"(?i)\b(not|except|excluding|apart from|least likely|"
                         r"none of|cannot|is false|untrue)\b")

GENERIC = re.compile(r"(?i)^(all|none|any|both|either|neither) of the (above|these|options)"
                     r"|^(true|false|yes|no|nothing|other)s?$")


def norm(text):
    """Lower case, punctuation out — but hyphens stay: "set-up cost" and
    "long-term" are single words to the notes and to the papers alike."""
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 -]+", " ", text.lower())).strip()


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
        self.lines = [(a, terms(t), len(words(t)), s, norm(t), stems(t))
                      for a, t, s in lines(doc)]
        self.ldf = {}
        for _, ts, _, _, _, _ in self.lines:
            for t in ts:
                self.ldf[t] = self.ldf.get(t, 0) + 1
        self.df = {}
        for sec in self.secs:
            ts = sec[2]
            for t in ts:
                self.df[t] = self.df.get(t, 0) + 1
        self.n = max(1, len(self.secs))

    def carries(self, option, section):
        """Lines that carry the answer itself.

        Word coverage rather than an exact phrase: a note says "Higher customer
        satisfaction" where the paper says "Increased customer satisfaction",
        and the words they share are what matter. Nothing is returned unless
        some line carries most of the answer, so a vague or generic option
        ("Valid", "All of the above") falls through to plain scoring."""
        if not option or GENERIC.match(option.strip()):
            return []
        plain_ws = words(norm(option))
        ws = set(stem(w) for w in plain_ws)
        if not ws:
            return []
        if len(ws) == 1:                      # one word, and only if it is rare
            if self.ldf.get(plain_ws[0], 99) > 3:
                return []
        rare = sum(math.log(1 + self.n / self.df.get(w, self.n)) for w in plain_ws)
        if rare < 1.2:                        # every word of it is everywhere
            return []

        def cover(only_here):
            best, hits = 0.0, []
            for anchor, ts, size, sec, raw, st in self.lines:
                if size < 2 or (only_here and sec != section):
                    continue
                c = sum(1 for w in ws if w in st) / len(ws)
                if c > best:
                    best, hits = c, [anchor]
                elif c == best and c:
                    hits.append(anchor)
            return best, hits

        # the section is already the considered answer to "where": only leave it
        # for a line that carries the answer almost whole
        best, hits = cover(True)
        if best >= 0.6:
            return hits
        best, hits = cover(False)
        return hits if best >= 0.85 else []

    def line(self, query, section, option="", odd=False, floor=3.0):
        """The line within the section that answers the question, if one stands out.

        A line carrying the answer itself wins outright; otherwise the section's
        own lines are scored, with short ones held to a higher bar — landing on
        a three-word bullet says less than landing on the sentence below it."""
        if odd:
            floor = 5.0
        said = [] if odd else self.carries(option, section)
        if len(said) == 1:
            return said[0]
        only = set(said)
        opt = {} if odd else terms(option)
        q, best = terms(query), None
        for anchor, ts, size, sec, raw, st in self.lines:
            if only:
                if anchor not in only:
                    continue
            elif sec != section or size < 3:
                continue
            s = 0.0
            for t in q:
                c = ts.get(t)
                if not c:
                    continue
                idf = math.log(1 + self.n / self.df.get(t, self.n))
                s += idf * min(c, 2) * (2.2 if " " in t else 1.0)
                if t in opt:                  # a word of the answer weighs most
                    s += idf * 4.0
            s /= math.log(6 + size)
            if size < 12 and not only:
                s *= 0.75
            if not best or s > best[0]:
                best = (s, anchor)
        if only:
            return best[1] if best else None
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


def pinned(docs, bank, n, doc_ids):
    """A hand-pinned landing, resolved from its phrase to an anchor."""
    phrase = corrections.AIM_FIX.get((bank, n))
    if not phrase:
        return None
    want = norm(phrase)
    for doc_id in doc_ids:
        for anchor, text, _ in lines(docs[doc_id]):
            if want in norm(text):
                return doc_id, anchor
        for anchor, head, _ in sections(docs[doc_id]):
            if anchor and want in norm(head):
                return doc_id, anchor
    raise ValueError("aim pinned to a phrase that is no longer in %s: %r"
                     % (bank + "#" + str(n), phrase))


def aim(root, docs, ref, floor=6.0):
    """{bank: [ {doc: anchor} | null, … ]} — one entry per question."""
    banks = load_banks(root)
    index = {k: Index(v) for k, v in docs.items()}
    out, hit, total, exact, pins = {}, 0, 0, 0, 0

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
                    line = index[doc_id].line(
                        query, found[1], q["o"][q["a"]] if q["o"] else "",
                        odd=bool(ODD_ONE_OUT.search(q["q"])))
                    targets[doc_id] = line or found[1]
                    hit += 1
                    if line:
                        exact += 1
            fixed = pinned(docs, bank, len(rows) + 1,
                           [ref[p.strip()] for p in str(q.get("s") or "").split("·")
                            if ref.get(p.strip())])
            if fixed:
                targets[fixed[0]] = fixed[1]
                pins += 1
            rows.append(targets or None)
        out[bank] = rows
    return out, hit, total, exact, pins
