# Shade The Appropriate Answer

A single-page quiz app covering two University of Lagos 400-level engineering courses:
**CIL 524** (Law of Engineering Contracts) and **BUS 440** (Management for Engineers).

418 multiple-choice questions in four banks, every one with a worked explanation.

| Bank | Questions | Source |
|---|---:|---|
| CIL 524 Past Questions | 70 | 2021/22 Second Semester Examination, transcribed verbatim |
| BUS 440 Past Questions | 120 | 2024/25 Continuous Assessment (30) + Examination (90) |
| CIL 524 Practice | 110 | Written from Classes 1–9 and the three slide decks |
| BUS 440 Practice | 118 | Written from the six lecturer blocks of the course outline |

## Deploy

`index.html` is the whole site. It is one self-contained file — no build step, no
dependencies, no server-side anything. The only external request is to Google Fonts.

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

Don't edit `index.html` directly — it is generated. The sources are in `src/`:

```
src/page.html          markup + all CSS (design tokens at the top)
src/app.js             quiz logic, routing, scoring, storage
src/bank-cil-pq.js     CIL 524 past questions
src/bank-bus-pq.js     BUS 440 past questions
src/bank-cil-new.js    CIL 524 practice questions
src/bank-bus-new.js    BUS 440 practice questions
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
  t: "Formation",                  // topic — drives the filter and score breakdown
  s: "Class 3",                    // source line shown top-right of the card
  q: "Contracts under seal are…",  // the stem
  o: ["Express Contracts", "…"],   // options, rendered A B C D E
  a: 2,                            // index of the correct option (0-based)
  w: "A contract under seal is…",  // explanation shown after answering
  calc: "EOQ = √(2DO/H) = 1,826",  // optional: monospace working line
  flag: "Per the lecture, …"       // optional: "check this" note on a defective question
}
```

## Features

- **Each bank is its own page** with its own URL — `#cil-pq`, `#bus-new`,
  `#cil-pq/results` — so the browser Back button works and a quiz can be bookmarked
- **A stationary action bar.** Prev / Next / Jump sit in a sticky bar at the foot of the
  screen. Revealing an answer does not move them, and does not scroll the page: measured
  at 0px of movement, with no horizontal overflow down to a 320px viewport
- **Instant feedback** — shade an option, the reasoning appears underneath
- **Exam mode** — sit a bank straight through, marks withheld until you finish
- **Jump panel** — the full answer sheet, topic filter, shuffle and reset, in a slide-up
  sheet rather than a sidebar competing with the question
- **Per-topic score breakdown**, weakest first, plus a review of everything you missed
- **Progress saves** to `localStorage`, with an in-memory fallback if storage is blocked
- **Keyboard** — `A`–`E` to shade, `←` `→` to move, `Enter` for next, `J` for the jump
  panel, `Esc` to close it or go home
- Light and dark themes, following the system by default

## Where the answers come from

**Every answer is worked from the 2025/26 course materials** — Classes 1–9 and the three
slide decks for CIL 524, and the six lecturer blocks of the course outline for BUS 440.
Each explanation names the class or slide it rests on.

The CIL paper came with a **marked student script. It is not a source here and was not
used at any point.** Where it disagreed with the lecture notes, the notes win and the
difference is spelt out in a "check this" note. The clearest case is Q2, where the script
answered "All of the above" for what makes a simple contract valid; Class 1 is explicit
that a simple contract may be oral or inferred from conduct and needs only consideration,
so this bank answers (d).

The BUS 440 paper carries no answer key at all. Those 120 answers are likewise worked from
the materials, and the arithmetic is shown for every numeric one.

Seven questions across the two papers are defective as printed — duplicated options, a
stem that contradicts its own choices, an answer no option supports. Those carry a
**"check this"** note setting out the conflict rather than silently picking a side.
Verify anything that matters against your lecturer.

## Typography

Three families, all from Google Fonts:

- **Familjen Grotesk** — headings, the wordmark, question numbers
- **Finlandica** — question stems, options, body copy
- **Spline Sans Mono** — labels, counters, option letters, worked calculations
