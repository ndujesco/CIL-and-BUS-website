# Shade The Appropriate Answer

A single-page quiz app covering two University of Lagos 400-level engineering courses:
**CIL 524** (Law of Engineering Contracts) and **BUS 440** (Management for Engineers).

418 multiple-choice questions in four banks, every one with a worked explanation —
and the 18 course documents those explanations were worked from, set as text on the
same site, one click from the question that cites them.

| Bank | Questions | Source |
|---|---:|---|
| CIL 524 Past Questions | 70 | 2021/22 Second Semester Examination, transcribed verbatim |
| BUS 440 Past Questions | 120 | 2024/25 Continuous Assessment (30) + Examination (90) |
| CIL 524 Practice | 110 | Written from Classes 1–9 and the three slide decks |
| BUS 440 Practice | 118 | Written from the six lecturer blocks of the course outline |

## Deploy

`index.html` is the whole site — questions, explanations and all 18 course documents.
It is one self-contained file of about 680 KB (about 190 KB over the wire, gzipped):
no build step, no dependencies, no server-side anything. The only external request is
to Google Fonts.

Drop it on any static host:

```sh
# Netlify (drag-and-drop also works at app.netlify.com/drop)
npx netlify-cli deploy --prod --dir .

# Vercel
npx vercel --prod

# Cloudflare Pages
npx wrangler pages deploy .

# GitHub Pages
git init && git add index.html && git commit -m "Deploy quiz"
git branch -M main && git remote add origin git@github.com:USER/REPO.git
git push -u origin main
# then: Settings → Pages → Deploy from branch → main → / (root)

# Surge
npx surge . your-name.surge.sh

# Any web server / cPanel: upload index.html to the web root.
```

To preview locally, open `index.html` in a browser, or:

```sh
python3 -m http.server 8000    # then visit http://localhost:8000
```

### Offline use

The page works offline apart from the webfonts, which fall back to Georgia and a
system monospace. To make it fully offline, download the three families and inline
them as `@font-face` data URIs in place of the `<link>` tag in `src/page.html`.

## Editing the questions

Don't edit `index.html` directly; it is generated. The sources are in `src/`:

```
src/page.html          markup + all CSS (design tokens at the top)
src/app.js             quiz logic, routing, scoring, storage, the reader
src/bank-cil-pq.js     CIL 524 past questions
src/bank-bus-pq.js     BUS 440 past questions
src/bank-cil-new.js    CIL 524 practice questions
src/bank-bus-new.js    BUS 440 practice questions
src/materials.js       the 18 course documents (generated, see below)
src/links.js           outside references, for what the materials do not cover
```

Then rebuild:

```sh
./build.sh
```

That regenerates `index.html` (standalone) and `artifact.html` (a headless fragment
for Claude Artifacts).

### Question format

```js
{
  t: "Formation",                  // topic; drives the filter and score breakdown
  s: "Class 3",                    // source; " · " separated. A piece naming a document
                                   // (Class 3, Block 5, Slide 1.2) or a key of LINKS
                                   // becomes a link, anything else stays as text
  q: "Contracts under seal are…",  // the stem
  o: ["Express Contracts", "…"],   // options, rendered A B C D E
  a: 2,                            // index of the correct option (0-based)
  w: "A contract under seal is…",  // explanation shown after answering
  calc: "EOQ = √(2DO/H) = 1,826",  // optional: monospace working line
  flag: "Per the lecture, …"       // optional: "check this" note on a defective question
}
```

## The materials

Everything the answers were worked from is on the site, at `#notes`, as text rather
than as files to download. Eighteen documents, about 50,000 words:

| | Documents | What they are |
|---|---:|---|
| CIL 524 | 9 | The class notes, Class 1 to Class 9 |
| CIL 524 | 3 | The lecture decks: Introduction, Formation of Contract, Terms of Contract |
| BUS 440 | 6 | One per lecturer block, stitched from that block's sources |

**Every question's source line is a link, and all 418 are sourced.** Answer a question
and what the answer was worked from is offered underneath it by name; clicking opens
the document over the question, **scrolled to the exact line the answer came from**,
with that line marked for a couple of seconds. The place you had reached in the bank is
still there behind it. The same documents have their own URLs (`#notes/cil-class-3`,
`#notes/bus-block-6`) for reading straight through, and the misses listed on the results
page carry the same citation.

The two past papers are sourced the same way. Each CIL question names its class or deck.
Each BUS question now names its paper **and** the lecturer block the answer rests on —
`Examination · Block 3` — worked out question by question from where the wording actually
appears in the materials, not from the topic label.

Twenty-five of those source lines point off the site instead, because the 2024/25 paper
examined things the 2025/26 materials do not carry: organisational change and resistance
to it, organisational conflict, the internal and external environment of business,
Garvin's dimensions of quality, ABC analysis, safety stock, acceptance sampling and
crashing a schedule. Those open a page on the web, marked with the site it goes to and
an arrow. They live in `src/links.js`; every URL there was checked. Add to that file
rather than inventing a link inside a question, and keep the key identical to the label
used in the question's `s:` field.

What is still plain text on a source line is the paper a question came from
(`Examination`, `Continuous assessment`) and the names beside a live reference — the
lecturer, or the theorist a question is about, like `Block 4 · Mintzberg`.

Nothing that only repeats another source is included:

- The **handwritten lecture notes** (blocks 1, 5 and 6) are photographs with no text in
  them. What is on the site is the page-by-page transcript of each, so the deck that
  bundles all five transcripts together is left out as a duplicate of them.
- **Chapters 12 and 14** of the operations-management textbook are photographs too, with
  no transcript. They are background reading for block 1, whose questions are worked
  from the inventory lecture, so they are left out rather than shipped as 30 page images.
- The **marked student script** and the second copy of the CIL paper are not sources at
  all and never were.

### Aiming a citation at a section

`tools/aim.py` matches every question against the document it cites and ships the winning
anchor with the banks, so the reader opens where the answer is rather than at the top of
a 10,000-word note. Every heading, paragraph, list item and equation carries an id, and
the match runs in two stages:

1. **Which section.** Plain retrieval: the words of the stem, its correct option and its
   explanation, scored against each section by inverse document frequency *within that
   document* — a word that is all over the note counts for little, a word that appears in
   one section counts for a lot — with a hit in the section's own heading weighted heavily
   and length discounted so the longest section cannot win by sheer size.
2. **Which line in it.** A line that carries the answer itself wins outright: word
   coverage rather than an exact phrase, lightly stemmed, so the paper's "Increased
   customer satisfaction" finds the note's "Higher customer satisfaction". Failing that,
   the section's lines are scored as above, with short ones held to a higher bar.

Two things the matching has to know about. A question whose answer is a **number**
("2.06") needs digits to be words, so they are. And an **odd-one-out** question — "which
of these is NOT…", "all except…" — is asking for the item the notes do *not* contain, so
leading with the answer would aim at nothing: those skip step 2's shortcut and are held
to a higher bar, landing on the section that lists the others.

Of 438 citations, **380 land on an exact line**, 37 on a section where no single line
stood out, and 21 open at the top of the document. Reading a random sample of 22 by hand,
about three in four land on the exact sentence and nearly all the rest land in the right
neighbourhood.

When one is wrong, pin it: `AIM_FIX` in `tools/corrections.py` maps a bank and question
number to a phrase from the line it should land on. The phrase is resolved to an anchor at
build time and **the build fails if it stops matching**, so a pin cannot rot when a note
is re-extracted. That last group is deliberate: when
nothing in a note matches well, a citation pointing confidently at the wrong paragraph is
worse than one pointing at the right document. The two floors in `aim.py` trade coverage
against precision, and the build prints the split every run.

Anchors are real URLs — `#notes/bus-block-1/bus-block-1-p0-25` — so a line can be linked
or bookmarked directly.

### Regenerating `src/materials.js`

```sh
python3 tools/extract-materials.py [CIL folder] [BUS folder]
./build.sh
```

It reads the two course folders — passed on the command line, or found beside this repo,
wherever the three of them happen to live — and writes `src/materials.js`. It needs PyMuPDF, python-pptx and python-docx:

```sh
pip3 install pymupdf python-pptx python-docx
```

### What the extractor corrects

`tools/corrections.py` is applied on the way out, so a re-run keeps every fix:

- **Typography** every document gets: the space a bold run leaves in front of its comma,
  `ﬁ`/`ﬂ` ligatures, `E.g` without its stop, `N5000` → `₦5,000`.
- **Shorthand** in the handwritten transcripts, expanded so the notes read as prose:
  `dd` → demand, `gds` → goods, `qty` → quantity, `b/w` → between, `mgt` → management,
  `r.m` → raw materials.
- **Wording**, per document: slips of the pen in the transcripts and slips of the keyboard
  in the lecturers' own decks — *sole* → *soul* in "the soul and life wire of any
  manufacturing organisation", *Carlil v Carbolic Smokeball* → *Carlill v Carbolic Smoke
  Ball*, MINTBERG → MINTZBERG, *mangers* → *managers*, *corective* → *corrective*, a
  numbered list that restarts at 1 because a paragraph interrupted it. Every entry is
  checked at build time: one that stops matching fails the build rather than passing
  silently.
- **The worked examples**, set as TeX and rendered by the same engine the answer
  explanations use, so a formula looks the same wherever it appears:

  ```
  EOQ = √(2DO / H)            →   \mathrm{EOQ} = \sqrt{\frac{2DO}{H}}
  UCL = D₄R̄                   →   \mathrm{UCL} = D_4\bar{R}
  ```

  46 equations across the three transcribed blocks. The extractor fails if one of them
  stops matching its paragraph, and reports any equation-like line it left as text.

None of this changes what a note says. It corrects how it says it.

`tools/` holds one reader per shape of source file — `from_pdf.py` for the typeset class
notes, the decks and plain prose PDFs, `from_office.py` for `.pptx` and `.docx`,
`from_md.py` for the transcripts — each turning its input into the same list of blocks.
Headings, lists, tables and the ASCII whiteboard diagrams survive; page furniture,
slide masters and layout do not.

## Features

- **Each bank is its own page** with its own URL (`#cil-pq`, `#bus-new`,
  `#cil-pq/results`) so the browser Back button works and a quiz can be bookmarked
- **A stationary action bar.** Prev / Next / Jump sit in a sticky bar at the foot of the
  screen. Revealing an answer does not move them, and does not scroll the page: measured
  at 0px of movement, with no horizontal overflow down to a 320px viewport
- **Instant feedback**: shade an option, the reasoning appears underneath, with the
  class, deck or block it came from named under that and one click from being read
- **Exam mode**: sit a bank straight through, marks withheld until you finish
- **Jump panel**: the full answer sheet, topic filter, shuffle and reset, in a slide-up
  sheet rather than a sidebar competing with the question
- **Per-topic score breakdown**, weakest first, plus a review of everything you missed
- **Progress saves** to `localStorage`, with an in-memory fallback if storage is blocked
- **Show the answer** when you simply do not know: a quiet row under the options in
  study mode. It is remembered separately from an answer — such a question scores
  neither right nor wrong, is marked apart in the answer sheet, and is counted as
  **looked up** on the results page
- **Keyboard**: `A`–`E` to shade, `S` to show the answer, `←` `→` to move, `Enter` for
  next, `J` for the jump panel, `Esc` to close it or go home
- **Maths set as maths**, in the notes as well as the answers: real fractions, radicals
  and bars, as MathML where the browser has it and a Unicode one-liner where it does not
- **A way to report a correction**: a WhatsApp link in the footer, at the foot of every
  document, and in the Jump panel — it opens the chat and leaves the message to the reader
- Light and dark themes, following the system by default

## Where the answers come from

**Every answer is worked from the 2025/26 course materials**: Classes 1–9 and the three
slide decks for CIL 524, and the six lecturer blocks of the course outline for BUS 440.
Every CIL question names the class or slide it rests on; the BUS practice questions name
the lecturer block, and the BUS past questions the paper they came from. Those names are
links: see [The materials](#the-materials).

The CIL paper came with a **marked student script. It is not a source here and was not
used at any point.** Where it disagreed with the lecture notes, the notes win and the
difference is spelt out in a "check this" note. The clearest case is Q2, where the script
answered "All of the above" for what makes a simple contract valid; Class 1 is explicit
that a simple contract may be oral or inferred from conduct and needs only consideration,
so this bank answers (d).

The BUS 440 paper carries no answer key at all. Those 120 answers are likewise worked from
the materials, and the arithmetic is shown for every calculated one.

Eight questions across the two papers are defective as printed: duplicated options, a
stem that contradicts its own choices, an answer no option supports. Those carry a
**"check this"** note setting out the conflict rather than silently picking a side.
Verify anything that matters against your lecturer.

## Typography

Three families, all from Google Fonts:

- **Familjen Grotesk**: headings, the wordmark, question numbers
- **Finlandica**: question stems, options, body copy
- **Spline Sans Mono**: labels, counters, option letters, worked calculations
