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

- **Instant feedback** — shade an option, the reasoning appears underneath
- **Exam mode** — sit a bank straight through, marks withheld until you finish
- **Topic filter** and **shuffle**, plus a per-topic score breakdown weakest-first
- **Progress saves** to `localStorage`, with an in-memory fallback if storage is blocked
- **Keyboard** — `A`–`E` to shade, `←` `→` to move, `Enter` for next, `S` shuffle, `M` mode, `Esc` home
- Light and dark themes, following the system by default

## A caution on the answers

The **CIL 524 answers come from a marked student script, not an official marking
scheme.** The **BUS 440 paper carries no answer key at all** — those 120 answers were
worked from the course materials, and the arithmetic is shown for every numeric one.

Seven questions across the two papers are defective as printed (duplicated options, a
stem that contradicts its own choices, an answer the lecture notes disagree with).
Those carry a **"check this"** note setting out the conflict rather than silently
picking a side. Verify anything that matters against your lecturer.
