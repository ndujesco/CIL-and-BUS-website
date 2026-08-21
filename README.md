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
the document over the question, so the place you had reached in the bank is still there
behind it. The same documents have their own URLs (`#notes/cil-class-3`,
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

### Regenerating `src/materials.js`

```sh
python3 tools/extract-materials.py [CIL folder] [BUS folder]
./build.sh
```

It reads the two course folders (by default the ones beside this repo in `~/Downloads`)
and writes `src/materials.js`. It needs PyMuPDF, python-pptx and python-docx:

```sh
pip3 install pymupdf python-pptx python-docx
```

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
- **Keyboard**: `A`–`E` to shade, `←` `→` to move, `Enter` for next, `J` for the jump
  panel, `Esc` to close it or go home
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
