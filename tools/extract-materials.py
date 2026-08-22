#!/usr/bin/env python3
"""Reads the two course folders and writes src/materials.js.

One document per thing a question can cite: twelve for CIL (nine class notes
and the three decks), six for BUS (one per lecturer block, each stitched from
the sources for that block). Anything that only repeats another source is left
out — the handwritten-note PDFs, for instance, are here as their transcripts.

    python3 tools/extract-materials.py [CIL folder] [BUS folder]
"""

import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from common import blocks_html, esc, plain, tidy, words_in
import corrections
import from_md
import from_office
import from_pdf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
HOME = os.path.expanduser("~/Downloads")
CIL = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    HOME, "CIL 524 - Introduction to Engineering Contracts", "2526")
BUS = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
    HOME, "BUS 440 - Management for Engineers", "2526")
TRANS = os.path.join(BUS, "Transcripts")

DOCS, REF = {}, {}


# ── assembling a document ─────────────────────────────────────────────
USED = set()


def add(doc_id, course, ref, title, kicker, parts, also=()):
    """parts: [{label, src, note, blocks}] — one per source file."""
    made = []
    n = 0
    for part in parts:
        blocks = part["blocks"]
        if part["src"].endswith(".md"):        # the handwritten-note transcripts
            blocks = [(b[0], corrections.shorthand(b[1])) + tuple(b[2:])
                      for b in blocks]
        blocks = [set_maths(b[0], b[1]) + tuple(b[2:]) for b in blocks]
        body = corrections.wording(
            corrections.typography(blocks_html(blocks)), doc_id, USED)
        html, toc = _number_headings(body, doc_id, n)
        n += len(toc)
        made.append({
            "label": part.get("label", ""),
            "note": part.get("note", ""),
            "src": part["src"],
            "html": html,
            "toc": toc,
        })
    DOCS[doc_id] = {
        "course": course, "ref": ref, "title": title, "kicker": kicker,
        "words": sum(words_in(p["html"]) for p in made),
        "parts": made,
    }
    for label in (ref,) + tuple(also):
        REF[label] = doc_id


NUMBERED = re.compile(r"^(?:<[^>]+>)*\s*(\d{1,2})\s*[\.\)]\s*")


def list_blocks(paras):
    """Slides often carry their own numbering inside the bullet text. Where they
    do, set them as a numbered list instead of a bullet with a number in it."""
    hits = [p for p in paras if NUMBERED.match(p)]
    if len(hits) < 2:
        return [("p", paras[0])] if len(paras) == 1 else [("li", p) for p in paras]
    out, started = [], False
    for html in paras:
        m = NUMBERED.match(html)
        if m:
            started = True
            out.append(("oli", NUMBERED.sub("", html, count=1), int(m.group(1))))
        else:
            out.append(("li" if started else "p", html))
    return out


MATH_USED = set()
EQ_LIKE = re.compile("[=\u221a\u00d7\u00f7\u2248\u00b1\u20a6\u03c3]")


def set_maths(kind, html):
    """A paragraph that is really an equation is replaced by its TeX setting."""
    if kind not in ("p", "li", "oli"):
        return kind, html
    text = re.sub(r"\s+", " ", plain(html)).strip()
    if text in corrections.MATHS:
        MATH_USED.add(text)
        # a numbered step keeps its number; anything else stands on its own
        return ("oli" if kind == "oli" else "raw"), corrections.MATHS[text]
    if "=" in text and len(EQ_LIKE.findall(text)) >= 2 \
            and len(re.findall(r"[A-Za-z]{4,}", text)) <= 5:
        UNSET.append(text)
    return kind, html


UNSET = []

HEAD = re.compile(r"<(h[23])>(.*?)</\1>", re.S)


def _number_headings(html, doc_id, start):
    """Give every heading an id so the contents list can jump to it."""
    toc = []

    def mark(m):
        tag, text = m.group(1), m.group(2)
        n = start + len(toc)
        toc.append({"id": doc_id + "-" + str(n), "t": plain(text),
                    "lv": 2 if tag == "h2" else 3})
        return '<' + tag + ' id="' + doc_id + "-" + str(n) + '">' + text + '</' + tag + '>'

    return HEAD.sub(mark, html), toc


MONTHS = ("January February March April May June July August September "
          "October November December").split()


def when(s):
    """"Class Date: June 4, 2025 | Lecturer: X" reads better as "4 June 2025 · X"."""
    s = s.replace("Class Date:", "").replace("Lecturer:", "").replace("|", "·")
    for i, m in enumerate(MONTHS, 1):
        s = re.sub(m + r"\s+(\d{1,2}),\s*(\d{4})", r"\1 " + m + r" \2", s)
    return tidy(re.sub(r"\s*·\s*", " · ", s)).strip(" ·")


# ── CIL 524 ───────────────────────────────────────────────────────────
DECKS = [
    ("cil-deck-1", "Slide 1.1", "1.1 introduction.pptx.pdf",
     "Introduction", "Law, courts and the sources of Nigerian contract law"),
    ("cil-deck-2", "Slide 1.2", "1.2 Engineering Contract _FORMATION OF CONTRACT.pptx.pdf",
     "Formation of Contract", "Offer, acceptance, consideration and intention"),
    ("cil-deck-3", "Slide 1.3", "1.3 Engineering Contract Terms .pptx.pdf",
     "Terms of Contract", "Conditions, warranties, innominate terms and exclusion clauses"),
]

CLASSES = {
    1: "Class 1 - CIL_Law_of_Engineering_Contract_Notes.pdf",
}


def do_cil():
    for doc_id, ref, fname, title, sub in DECKS:
        meta, slides = from_pdf.deck(os.path.join(CIL, fname))
        cover = meta.get("cover", [])
        who = next((c for c in cover if c.startswith("Dr")), "")
        blocks, last = [], ""
        for n, head, paras in slides:
            if head and not same_head(plain(head), last):
                last = CTD.sub("", plain(head)).strip()
                blocks.append(("h3", head))
            blocks += list_blocks(paras)
        add(doc_id, "CIL", ref, title,
            "Lecture deck · " + (who or "Faculty of Law") + " · "
            + str(len(slides) + 1) + " slides",
            [{"label": sub, "src": fname, "blocks": blocks}])

    for n in range(1, 10):
        fname = CLASSES.get(n) or (
            "Class %d - CIL_Law_of_Engineering_Contract_Class%d_Notes.pdf" % (n, n))
        if not os.path.exists(os.path.join(CIL, fname)):
            fname = fname.replace("Class %d -" % n, "Class %d-" % n)
        meta, blocks = from_pdf.cil_notes(os.path.join(CIL, fname))
        sub = meta.get("sub", "")
        title = sub.split("|")[-1].strip() if "|" in sub else sub
        add("cil-class-%d" % n, "CIL", "Class %d" % n, title,
            "Class notes · " + when(meta.get("when", "2025/26")),
            [{"label": "", "src": fname, "blocks": blocks}])


# ── BUS 440 ───────────────────────────────────────────────────────────
def transcript(fname):
    """A transcript: its own H1 is the part title, the credit line its note.

    Every H2 in these is a notebook page number, which is a marker rather than
    a section, so it is set as one and kept out of the contents list.
    """
    raw = open(os.path.join(TRANS, fname), encoding="utf-8").read()
    blocks = from_md.blocks(raw)
    label, note = "", ""
    while blocks and blocks[0][0] in ("h2", "p"):
        kind, html = blocks[0][0], blocks[0][1]
        text = plain(html)
        if kind == "h2" and not label:
            label = re.sub(r"^BUS 440\s*[—–-]\s*", "", text)
        elif html.startswith("<b>") and not note:
            note = text
        elif "Transcribed from" in text:
            pass
        else:
            break
        blocks.pop(0)
    blocks = [("h4",) + tuple(b[1:]) if b[0] == "h2" else b for b in blocks]
    return {"label": label, "note": note, "src": fname, "blocks": blocks}


CTD = re.compile("(?i)\\s*[\\(\\[]?\\s*(?:cont['\u2019]?d|ctd|continued)\\.?\\s*[\\)\\]]?\\s*$")


def same_head(title, last):
    """A deck often carries one heading across several slides, sometimes with
    a "(cont'd)" hung on it. The second one is noise in a contents list."""
    a = CTD.sub("", title or "").strip().lower()
    return not a or a == (last or "").strip().lower()


def pptx_part(fname, label="", note="", cover=True):
    slides = from_office.deck(os.path.join(BUS, fname))
    if cover and slides:
        n, title, body = slides[0]
        if not note:
            note = plain(" · ".join(h for _, h in body))
        if not label:
            label = title
        slides = slides[1:]
    blocks, last = [], ""
    for n, title, body in slides:
        if title and not same_head(title, last):
            last = CTD.sub("", title).strip()
            blocks.append(("h3", esc(last)))
        paras = [h for _, h in body]
        tables = [p for p in paras if p.startswith("<table")]
        paras = [p for p in paras if not p.startswith("<table")]
        if paras:
            blocks += list_blocks(paras)
        blocks += [("table", t) for t in tables]
    return {"label": label, "note": note, "src": fname, "blocks": blocks}


def do_bus():
    add("bus-block-1", "BUS", "Block 1", "Inventory Management",
        "Block 1 · Dr Glorious Adekoya",
        [transcript("1.1 Inventory Management (transcript).md")])

    meta, blocks = from_office.notes(
        os.path.join(BUS, "2. BUS 440 LECTURE NOTE 2025-2026 UNIVERSITY OF LAGOS.docx"),
        masthead=5)
    add("bus-block-2", "BUS", "Block 2",
        "Management: Evolution, Definition and Functions",
        "Block 2 · Dr S. Edegwa",
        [{"label": "Lecture note", "note": plain(meta[3]) if len(meta) > 3 else "",
          "src": "2. BUS 440 LECTURE NOTE 2025-2026 UNIVERSITY OF LAGOS.docx",
          "blocks": blocks}])

    tqm = from_pdf.flow(os.path.join(BUS, "3.2 total-quality-management-bus-314.pdf"),
                        head_re=r"Topic \d")
    tqm = [(k, h) for k, h in tqm if "BUS 314: TOTAL QUALITY" not in h]
    add("bus-block-3", "BUS", "Block 3", "Total Quality Management",
        "Block 3 · Dr O. G. Oyenuga", [
            pptx_part("3.1 INTRODUCTION TO TOTAL QUALITY MANAGEMENT.pptx",
                      label="Introduction to Total Quality Management"),
            {"label": "Total Quality Management in full",
             "note": "The eight-topic note the deck condenses",
             "src": "3.2 total-quality-management-bus-314.pdf", "blocks": tqm},
        ])

    add("bus-block-4", "BUS", "Block 4",
        "Leadership, Managerial Skills and Organisations",
        "Block 4 · Dr Abraham Osa Ehiorobo", [
            pptx_part("4.2 MANAGERIAL ROLES, SKILLS AND TYPES OF ORGANIZATIONS.pptx",
                      label="Managerial Roles, Skills and Types of Organizations"),
            pptx_part("4.1 LEADERSHIP, TRUST AND MANAGING COMMUNICATION.pptx",
                      label="Leadership, Trust and Managing Communication"),
            pptx_part("4.3 MANAGING COMMUNICATION AND INFORMATION.pptx",
                      label="Managing Communication and Information"),
        ])

    add("bus-block-5", "BUS", "Block 5",
        "Quality Control and Statistical Process Control",
        "Block 5 · Dr O. P. Olonade", [
            transcript("5.1 Lecture 2 - 22nd June (transcript).md"),
            transcript("5.2 Lecture 3 (transcript).md"),
        ])

    add("bus-block-6", "BUS", "Block 6", "Project Management",
        "Block 6 · Miss Mary Isaac", [
            pptx_part("6.1 BUS440(1).pptx", label="Project Management",
                      note="Stages, components, evaluation, appraisal and control"),
            transcript("6.2 Lecture 1 - 22nd May (transcript).md"),
            transcript("6.3 Lecture 3 - July 24 (transcript).md"),
        ])


# ── the course outline, transcribed from the photograph ───────────────
OUTLINE = [
    ("1", "Dr Glorious Adekoya", [
        "Inventory Management", "Inventory Control and Techniques",
        "Economic Order Quantity — EOQ", "Production planning and control",
        "Levels of production planning",
        "Types of Production planning and Systems",
        "Elements of Production planning and Control"]),
    ("2", "Dr S. Edegwa", [
        "Course Overview and Introduction",
        "Management: Evolution, Definition, and Functions",
        "Management: Art, Science or Both",
        "Evolution of Management Theories",
        "Management and Administration: Conceptual Clarification"]),
    ("3", "Dr O. G. Oyenuga", [
        "Total Quality Management",
        "Dimensions of Total Quality Management — TQM",
        "Total Quality Management Tools",
        "Obstacles to Implementing Total Quality Management",
        "ISO 9000 and other Quality Systems"]),
    ("4", "Dr E. O. Abraham", [
        "Management and Leadership", "Managerial Skills",
        "Managers and Business Environment", "Managing Organisational Change",
        "Communication in the Workplace", "Conflict in the Workplace"]),
    ("5", "Dr O. P. Olonade", [
        "Quality control", "Statistical quality control",
        "Variation in process Quality and Sources", "Quality systems",
        "Elements and Implementation of Quality Systems"]),
    ("6", "Miss Mary Isaac", [
        "Project management", "Stages and Components of Project Management",
        "Project evaluation, appraisal and Control Process"]),
]


def outline_html():
    rows = []
    for block, who, topics in OUTLINE:
        rows.append(
            '<tr><td class="bk"><a href="#notes/bus-block-' + block + '">'
            + esc(block) + "</a></td><td>"
            + "".join("<span>" + esc(t) + "</span>" for t in topics)
            + '</td><td class="who">' + esc(who) + "</td></tr>")
    return ('<table class="outline"><tr><th>Block</th><th>Course topics</th>'
            "<th>Lecturer</th></tr>" + "".join(rows) + "</table>")


# ── output ────────────────────────────────────────────────────────────
def js(value):
    return json.dumps(value, ensure_ascii=False).replace("</", "<\\/")


def main():
    do_cil()
    do_bus()
    corrections.check(USED)
    spare = set(corrections.MATHS) - MATH_USED
    if spare:
        raise corrections.Miss("equations that no longer match:\n  "
                               + "\n  ".join(sorted(spare)))

    shelves = [
        {"course": "CIL", "code": "CIL 524", "name": "Law of Engineering Contracts",
         "note": "Nine class notes taken from the 2025/26 lectures, and the three "
                 "decks Dr Ilobinso taught from.",
         "groups": [
             {"label": "Class notes", "ids": ["cil-class-%d" % n for n in range(1, 10)]},
             {"label": "Lecture decks", "ids": [d[0] for d in DECKS]},
         ]},
        {"course": "BUS", "code": "BUS 440", "name": "Management for Engineers",
         "note": "One document per lecturer block, following the course outline. "
                 "Where a lecturer's notes were handwritten, the transcript stands "
                 "in for the photographs.",
         "groups": [
             {"label": "The six blocks", "ids": ["bus-block-%d" % n for n in range(1, 7)]},
         ]},
    ]

    out = os.path.join(ROOT, "src", "materials.js")
    with open(out, "w", encoding="utf-8") as f:
        f.write("/* Generated by tools/extract-materials.py — do not edit by hand.\n"
                "   The 2025/26 course materials, one document per citable source. */\n")
        f.write("var DOCS = " + js(DOCS) + ";\n")
        f.write("var SHELVES = " + js(shelves) + ";\n")
        f.write("var REF = " + js(REF) + ";\n")
        f.write("var OUTLINE = " + js(outline_html()) + ";\n")

    if UNSET:
        print("equation-like lines left as text:")
        for t in UNSET:
            print("   " + t[:110])
    total = sum(d["words"] for d in DOCS.values())
    print("materials.js  %d documents, %s words, %d bytes"
          % (len(DOCS), format(total, ","), os.path.getsize(out)))
    for doc_id, d in DOCS.items():
        print("  %-14s %-46s %6s words  %d part(s)"
              % (doc_id, d["title"][:46], format(d["words"], ","), len(d["parts"])))


if __name__ == "__main__":
    main()
