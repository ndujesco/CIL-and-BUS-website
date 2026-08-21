"""PDF → blocks.

Three shapes of PDF turn up in the course folders and each gets its own reader:

  cil_notes   the CIL class notes, which are a typeset document: type size
              alone tells a heading from a paragraph, and a bulleted item
              arrives as a block whose first line is the bullet glyph
  deck        a slide deck exported to PDF: one page is one slide, and the
              largest type on the page is its title
  flow        a plain prose document in a single type size, where bold marks
              the headings and the left margin marks the list items
"""

import re
import fitz

from common import Run, runs_html, tidy


LEAD = re.compile("^[\\s\\u0000-\\u001f\\uf000-\\uf0ff\u2022\u25aa\u25e6\u2023]")
MARKER = re.compile(r"\s*(?:[●•▪◦‣]|\d+[\.\)]|[a-z][\.\)])\s*")


def _bold(span):
    return "Bold" in span["font"] or bool(span["flags"] & 16)


def _italic(span):
    return ("Italic" in span["font"] or "Oblique" in span["font"]
            or bool(span["flags"] & 2))


def _line_runs(line):
    return [Run(s["text"], _bold(s), _italic(s)) for s in line["spans"]]


def _block_runs(lines):
    runs = []
    for n, line in enumerate(lines):
        if n:
            runs.append(Run(" "))
        runs += _line_runs(line)
    return runs


def _plain(lines):
    return tidy(" ".join("".join(s["text"] for s in l["spans"]) for l in lines))


def _size(lines):
    return max(round(s["size"], 1) for l in lines for s in l["spans"])


def _mostly_bold(lines):
    b = sum(len(s["text"]) for l in lines for s in l["spans"] if _bold(s))
    n = sum(len(s["text"]) for l in lines for s in l["spans"])
    return n and b / n > 0.6


def text_blocks(page):
    return [b for b in page.get_text("dict")["blocks"] if "lines" in b]


# ── the CIL class notes ───────────────────────────────────────────────
def cil_notes(path):
    doc = fitz.open(path)
    meta, out, masthead = {}, [], True
    for pi, page in enumerate(doc):
        foot = page.rect.height - 42
        for b in text_blocks(page):
            lines = b["lines"]
            plain = _plain(lines)
            if not plain:
                continue
            size, bold = _size(lines), _mostly_bold(lines)

            if masthead:                    # title, subtitle and date, page 1
                if size >= 18:
                    meta["title"] = plain
                    continue
                if bold and size >= 12.5:
                    masthead = False        # the first heading: notes proper
                elif size >= 10.5:
                    meta["sub"] = plain
                    continue
                else:
                    meta["when"] = (meta.get("when", "") + " · " + plain).strip(" ·")
                    continue
            if b["bbox"][1] > foot and re.fullmatch(r"[\d\s|/of]+", plain):
                continue                                   # page number

            if plain == "•":                               # a lone bullet glyph
                continue
            if lines[0]["spans"][0]["text"].strip() == "•":
                out.append(("li", runs_html(_block_runs(lines[1:]))))
            elif bold and size >= 12.5:
                out.append(("h2", runs_html(_block_runs(lines))))
            elif bold and size >= 10.5:
                out.append(("h3", runs_html(_block_runs(lines))))
            else:
                out.append(("p", runs_html(_block_runs(lines))))
    doc.close()
    return meta, out


# ── a slide deck exported to PDF ──────────────────────────────────────
def deck(path, skip_first=True):
    """One slide per page: a heading, then the bullets under it.

    PowerPoint prints a bullet as a blank glyph, so a new bullet shows up as a
    line sitting at the outer left margin (its wrapped remainder is indented a
    notch further in). That margin, not the type size, is what separates the
    items: on several slides the wrapped text is set larger than the title.
    """
    doc = fitz.open(path)
    meta, out = {}, []
    for pi, page in enumerate(doc):
        lines = []
        for b in text_blocks(page):
            for l in b["lines"]:
                raw = "".join(s["text"] for s in l["spans"])
                if tidy(raw) in ("", "-", "•", "|"):
                    continue
                lines.append({
                    "raw": raw, "txt": tidy(raw),
                    "x": l["bbox"][0], "y": l["bbox"][1],
                    "size": round(max(s["size"] for s in l["spans"]), 1),
                    "runs": _line_runs(l),
                })
        if not lines:
            continue
        lines.sort(key=lambda l: (round(l["y"]), l["x"]))

        if pi == 0 and skip_first:                        # the cover slide
            meta["cover"] = [l["txt"] for l in lines if len(l["txt"]) > 2]
            continue

        head = []
        while lines:
            first = lines[0]
            if LEAD.match(first["raw"]) or len(first["txt"]) > 90:
                break                                     # a bullet, not a title
            if head and (first["size"] != head[-1]["size"]
                         or sum(len(h["txt"]) for h in head) + len(first["txt"]) > 70):
                break                                     # the title ended a line ago
            head.append(lines.pop(0))

        body, cur = [], []
        lead = min([l["x"] for l in lines], default=0)
        for l in lines:
            if cur and (l["x"] <= lead + 8 or LEAD.match(l["raw"])):
                body.append(cur)
                cur = []
            cur += ([Run(" ")] if cur else []) + l["runs"]
        if cur:
            body.append(cur)

        paras, carry = [], ""
        for runs in body:
            html = re.sub(r"^(?:[●•▪◦‣]|[-–—](?=\s))\s*", "", runs_html(runs))
            html = (carry + " " + html).strip() if carry else html
            carry = ""
            if not html:
                continue
            if MARKER.fullmatch(re.sub(r"<[^>]+>", "", html)):
                carry = html                  # a stray bullet or number: it
                continue                      # belongs to the line below it
            paras.append(html)
        if carry:
            paras.append(carry)
        head_html = re.sub(r"</?b>", "", runs_html(_join(head))) if head else ""
        out.append((pi + 1, head_html, paras))
    doc.close()
    return meta, out


def _join(lines):
    runs = []
    for n, l in enumerate(lines):
        if n:
            runs.append(Run(" "))
        runs += l["runs"]
    return runs


# ── plain prose, one type size, bold headings ─────────────────────────
def flow(path, head_re=None, drop=()):
    doc = fitz.open(path)
    lines = []
    for page in doc:
        foot = page.rect.height - 48
        for b in text_blocks(page):
            for l in b["lines"]:
                txt = tidy("".join(s["text"] for s in l["spans"]))
                if not txt or l["bbox"][1] > foot and re.fullmatch(r"[\d\s]+", txt):
                    continue
                lines.append({
                    "x": round(l["bbox"][0]),
                    "y": round(l["bbox"][1]),
                    "h": l["bbox"][3] - l["bbox"][1],
                    "txt": txt,
                    "runs": _line_runs(l),
                    "bold": _mostly_bold([l]),
                })
    doc.close()

    out, cur, kind = [], [], "p"

    def flush():
        if cur:
            html = runs_html(cur)
            if html and html not in drop:
                out.append((kind, html))
        cur.clear()

    for n, ln in enumerate(lines):
        txt, prev = ln["txt"], lines[n - 1] if n else None
        if ln["bold"] and len(txt) < 110 and not txt.endswith("."):
            # A heading that wrapped carries on tight under its first line; a
            # fresh heading sits a blank line clear of whatever came before.
            if (kind[:1] == "h" and cur and prev and prev["bold"]
                    and 0 < ln["y"] - prev["y"] < prev["h"] * 1.5):
                cur += [Run(" ")] + ln["runs"]
                continue
            flush()
            kind = "h2" if (head_re and re.match(head_re, txt)) else "h3"
            cur += ln["runs"]
            continue
        if kind[:1] == "h":
            flush()
            kind = "p"
        if re.match(r"^\d+[\.\)]\s+\S", txt) and ln["x"] > 80:
            flush()
            kind = "oli"
            cur += _strip_marker(ln["runs"])
            continue
        if re.match(r"^[•▪◦‣]\s*\S", txt):
            flush()
            kind = "li"
            cur += _strip_marker(ln["runs"])
            continue
        if kind in ("oli", "li") and ln["x"] <= 80 and not cur:
            kind = "p"
        cur += ([Run(" ")] if cur else []) + ln["runs"]
    flush()

    # A wrapped line can carry the next numbered item along with it; split those.
    split = []
    for k, html in out:
        if k == "oli":
            for p in re.split(r"\s(?=\d+\.\s+[A-Z])", html):
                split.append(("oli", re.sub(r"^\d+\.\s+", "", p)))
        else:
            split.append((k, html))

    # Some lists were typed as bullets inside a run of prose. Lift those out.
    lifted = []
    for k, html in split:
        parts = re.split(r"\s*•\s+", html)
        if k in ("p", "oli", "li") and len(parts) > 2:
            if parts[0].strip():
                lifted.append((k, parts[0].strip()))
            lifted += [("li", p.strip()) for p in parts[1:] if p.strip()]
        else:
            lifted.append((k, html))
    return lifted


def _strip_marker(runs):
    runs = [Run(r.text, r.b, r.i) for r in runs]
    for r in runs:
        if r.text.strip():
            r.text = re.sub(r"^\s*(?:[•▪◦‣]|\d+[\.\)])\s*", "", r.text, count=1)
            break
    return runs
