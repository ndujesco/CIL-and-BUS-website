"""Markdown → blocks.

Only the marks the transcripts actually use: headings, ordered and unordered
lists, tables, fenced blocks (the ASCII diagrams copied off the whiteboard),
block quotes, rules, and inline bold / italic / code.
"""

import re

from common import esc


def _inline(s):
    s = esc(s)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"(?<![\w*])\*([^*\n]+)\*(?![\w*])", r"<i>\1</i>", s)
    s = re.sub(r"(?<!\w)_([^_\n]+)_(?!\w)", r"<i>\1</i>", s)
    return s.strip()


def _row(line):
    cells = line.strip().strip("|").split("|")
    return [c.strip() for c in cells]


def blocks(text, demote=0):
    """demote shifts every heading down a level, for stitching parts together."""
    lines = text.replace("\r\n", "\n").split("\n")
    out, para, i = [], [], 0

    def flush():
        if para:
            out.append(("p", _inline(" ".join(para))))
        para.clear()

    while i < len(lines):
        raw = lines[i]
        line = raw.strip()

        if line.startswith("```"):
            flush()
            i += 1
            buf = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                buf.append(lines[i])
                i += 1
            i += 1
            while buf and not buf[0].strip():
                buf.pop(0)
            while buf and not buf[-1].strip():
                buf.pop()
            out.append(("pre", "<pre>" + esc("\n".join(buf)) + "</pre>"))
            continue

        if not line:
            flush()
            i += 1
            continue

        if re.fullmatch(r"(?:-{3,}|\*{3,}|_{3,})", line):
            flush()
            i += 1
            continue                                  # a rule: the gap says it

        m = re.match(r"^(#{1,6})\s+(.*)$", line)
        if m:
            flush()
            level = min(6, len(m.group(1)) + demote)
            out.append(("h" + str(max(2, level)), _inline(m.group(2))))
            i += 1
            continue

        if line.startswith("|") and i + 1 < len(lines) \
                and re.match(r"^\s*\|[\s:\-|]+\|\s*$", lines[i + 1]):
            flush()
            head = _row(line)
            i += 2
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                rows.append(_row(lines[i]))
                i += 1
            html = "<table><tr>" + "".join(
                "<th>" + _inline(c) + "</th>" for c in head) + "</tr>"
            for r in rows:
                html += "<tr>" + "".join(
                    "<td>" + _inline(c) + "</td>" for c in r) + "</tr>"
            out.append(("table", html + "</table>"))
            continue

        if line.startswith(">"):
            flush()
            buf = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                buf.append(lines[i].strip().lstrip(">").strip())
                i += 1
            out.append(("quote", _inline(" ".join(buf))))
            continue

        m = re.match(r"^(\d+)[\.\)]\s+(.*)$", line)
        if m:
            flush()
            # keep the number the source gave it: a list interrupted by a
            # paragraph has to pick up where it left off, not restart at 1
            out.append(("oli", _inline(_wrapped(lines, i, m.group(2))), int(m.group(1))))
            i = _skip(lines, i)
            continue

        m = re.match(r"^[-*+]\s+(.*)$", line)
        if m:
            flush()
            out.append(("li", _inline(_wrapped(lines, i, m.group(1)))))
            i = _skip(lines, i)
            continue

        para.append(line)
        i += 1

    flush()
    return out


def _wrapped(lines, i, first):
    """A list item plus any plain continuation lines indented under it."""
    parts, j = [first], i + 1
    while j < len(lines) and lines[j].startswith(("   ", "\t")) \
            and lines[j].strip() and not re.match(r"^\s*[-*+\d]", lines[j].strip()):
        parts.append(lines[j].strip())
        j += 1
    return " ".join(parts)


def _skip(lines, i):
    j = i + 1
    while j < len(lines) and lines[j].startswith(("   ", "\t")) \
            and lines[j].strip() and not re.match(r"^\s*[-*+\d]", lines[j].strip()):
        j += 1
    return j
