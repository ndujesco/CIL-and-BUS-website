"""Shared bits for the material extractors: escaping, inline runs, block assembly."""

import re

# ── escaping ──────────────────────────────────────────────────────────
def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


# PowerPoint sets its bullets in a symbol font, so what comes out of the PDF
# is a control character or a private-use codepoint, not a bullet.
JUNK = re.compile("[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\uf000-\\uf0ff]")


def tidy(s):
    """Collapse the whitespace a PDF or a slide leaves behind."""
    s = JUNK.sub("", str(s))
    s = s.replace(" ", " ").replace("ﬁ", "fi").replace("ﬂ", "fl")
    s = re.sub(r"[ \t]+", " ", s)
    return s.strip()


# ── inline runs ───────────────────────────────────────────────────────
class Run:
    __slots__ = ("text", "b", "i")

    def __init__(self, text, b=False, i=False):
        self.text, self.b, self.i = text, b, i


def runs_html(runs):
    """Merge adjacent runs of the same weight, then wrap them."""
    merged = []
    for r in runs:
        if merged and merged[-1].b == r.b and merged[-1].i == r.i:
            merged[-1].text += r.text
        else:
            merged.append(Run(r.text, r.b, r.i))

    out = []
    for r in merged:
        t = JUNK.sub("", r.text).replace(" ", " ")
        if not t.strip():
            out.append(" " if t else "")
            continue
        lead = " " if t[:1] == " " else ""
        trail = " " if t[-1:] == " " else ""
        body = esc(t.strip())
        if r.b:
            body = "<b>" + body + "</b>"
        if r.i:
            body = "<i>" + body + "</i>"
        out.append(lead + body + trail)
    return re.sub(r"\s+", " ", "".join(out)).strip()


# ── block assembly ────────────────────────────────────────────────────
# A block is a (kind, html) pair. Kinds: h2 h3 h4 p li oli pre quote table
def blocks_html(blocks):
    """Turn the flat block list into HTML, gathering runs of list items."""
    out, i = [], 0
    while i < len(blocks):
        kind, html = blocks[i]
        if kind[:1] == "h":                 # a heading is already bold
            html = re.sub(r"</?b>", "", html)
        if kind in ("li", "oli"):
            tag = "ul" if kind == "li" else "ol"
            items = []
            while i < len(blocks) and blocks[i][0] == kind:
                items.append("<li>" + blocks[i][1] + "</li>")
                i += 1
            out.append("<" + tag + ">" + "".join(items) + "</" + tag + ">")
            continue
        if kind in ("pre", "table"):
            out.append(html)
        elif kind == "quote":
            out.append("<blockquote>" + html + "</blockquote>")
        else:
            out.append("<" + kind + ">" + html + "</" + kind + ">")
        i += 1
    return "".join(out)


def words_in(html):
    return len(re.sub(r"<[^>]+>", " ", html).split())


def plain(html):
    """Tags off, entities back to characters: metadata is stored as plain text."""
    import html as _html
    return tidy(_html.unescape(re.sub(r"<[^>]+>", " ", str(html))))
