"""What the extractor fixes on its way out.

Three passes, all applied at build time so a re-run of the extractor keeps them:

  TYPO      typography every document gets: the space a bold run leaves in
            front of its comma, ligatures, "e.g" without its stop
  SHORTHAND the handwritten notes are written in a telegraphic shorthand
            (dd, gds, qty, b/w). Expanded so the notes read as prose
  FIXES     wording, per document: slips of the pen in the transcripts and
            slips of the keyboard in the lecturers' own decks. Each one is
            checked at build time, so an entry that stops matching is an
            error rather than a silent no-op
  MATHS     the worked examples, set as TeX. The key is the paragraph as it
            comes out of the source; the value is what replaces it

Nothing here changes what a note says. It corrects how it says it.
"""

import re

# ── typography ────────────────────────────────────────────────────────
TYPO = [
    (r"ﬁ", "fi"), (r"ﬂ", "fl"), (r"ﬀ", "ff"), (r"ﬃ", "ffi"), (r"ﬄ", "ffl"),
    # a bold or italic run ends with its space inside it: "a <b>term</b> , because"
    (r"\s+([,.;:!?])(\s|<|$)", r"\1\2"),
    (r"([(\[])\s+", r"\1"), (r"\s+([)\]])", r"\1"),
    # "E.g Constitutional Law" — the stop is missing more often than not
    (r"\b([Ee]\.g|[Ii]\.e|cf)(?![.\w])(?=\s*(?:<[^>]+>)*\s*[A-Za-z(])", r"\1."),
    (r"\b(etc|viz)\s+(?=[A-Za-z(])", r"\1. "),
    (r"\b(etc|viz)\b(?![.\w])", r"\1."),
    (r"\s+—\s+", " — "),
    (r"\bN\s*(\d{1,3}(?:,\d{3})+)", r"₦\1"),          # N5000 → ₦5,000
]

# ── the shorthand of the handwritten notes ────────────────────────────
SHORTHAND = [
    (r"\bb/w\b", "between"), (r"\bbtw\b", "between"),
    (r"\bdd\b", "demand"), (r"\bDd\b", "Demand"),
    (r"\bgds\b", "goods"), (r"\bqty\b", "quantity"), (r"\bQty\b", "Quantity"),
    (r"\bmgt\b", "management"), (r"\bMgt\b", "Management"),
    (r"\borg\b", "organisation"), (r"\borgs\b", "organisations"),
    (r"\bdiff\b", "different"), (r"\br\.m\b", "raw materials"),
    (r"\bR\.M\b", "Raw materials"), (r"\bI\.C\.", "inventory cost"),
    (r"\bno\.\s+of\b", "number of"), (r"\bNo\.\s+of\b", "Number of"),
    (r"(?<![\w'])u(?![\w'])", "you"),
]

# ── wording, per document ─────────────────────────────────────────────
FIXES = {
    "bus-block-1": [
        ("Inventory are the sole and life wire", "Inventories are the soul and life wire"),
        ("this are the cost of running out of stock",
         "these are the costs of running out of stock"),
        ("<b>Ordering cost</b> — are the cost incurred",
         "<b>Ordering cost</b> — the cost incurred"),
        ("<b>Set-up cost</b> — are cost incurred",
         "<b>Set-up cost</b> — the cost incurred"),
        ("Customers service level", "Customer service level"),
        ("an effective balance between the inventory cost[s] are involved in inventory management",
         "an effective balance must be struck between the costs involved in inventory management"),
        ("demand pattern are known", "demand patterns are known"),
        ("The one that gives you the least is where you go for",
         "The one that gives the least total cost is the one to go for"),
    ],
    "bus-block-4": [
        ("MINTBERG", "MINTZBERG"),
        ("<li>a liaison officers</li>", "<li>a liaison officer</li>"),
        ("frontline mangers", "frontline managers"),
        ("operational mangers", "operational managers"),
        ("informal organiation", "informal organisation"),
        ("the organization ‘s operations", "the organization's operations"),
    ],
    "bus-block-5": [
        ("a business['] overall performance", "a business's overall performance"),
        ("record data in a firm, systematic[ally].",
         "record data in a firm and systematic way."),
        ("all the potential or real causes that results in a single effect",
         "all the potential or real causes that result in a single effect"),
        ("the organisation['s] management", "the organisation's management"),
        ("Can be utilized for estimating", "Can be utilised for estimating"),
        ("This is a problem solving tool", "This is a problem-solving tool"),
        ("manufacture of large scale production", "manufacture of large-scale production"),
    ],
    "bus-block-6": [
        ("Mary Parket Follet", "Mary Parker Follett"),
        ("identifing project team", "identifying the project team"),
        ("corective actions", "corrective actions"),
        ("project schedulling", "project scheduling"),
        ("on track and and meets its objectives", "on track and meets its objectives"),
        ("Where issues arises", "Where issues arise"),
        ("the workbreakdown structure", "the work breakdown structure"),
        ("evaluate alternative course of actions",
         "evaluate alternative courses of action"),
        ("Develop a work-performance criteria", "Develop work-performance criteria"),
        ("The critical parts of the project are established and give attention to them.",
         "Identify the critical parts of the project and give attention to them."),
        ("Specify the inter-relationships", "Specify the interrelationships"),
        ("it strongly emphasizes cashflows", "it strongly emphasises cash flows"),
    ],
    "cil-deck-1": [
        ("judge-made law e.g. carlil carbolic",
         "judge-made law, e.g. Carlill v Carbolic Smoke Ball"),
        ("Electoral Act C<b>ustomary law</b>", "Electoral Act, <b>Customary law</b>"),
        ("advert to by 2 tyres", "advert to buy 2 tyres"),
        ("e.g. SoG Act 1893", "e.g. the Sale of Goods Act 1893"),
        ("get N5000 fuel", "get ₦5,000 fuel"),
    ],
    "cil-deck-2": [
        ("Carlil v Carbolic Smokeball", "Carlill v Carbolic Smoke Ball"),
        ("In other to determine", "In order to determine"),
        ("the client replies, i accept your offer",
         "the client replies, ‘I accept your offer"),
        ("in exchange for an iphone", "in exchange for an iPhone"),
        ("Request for uber.", "Request for an Uber."),
        ("agreement btw husbands", "agreement between husbands"),
        ("is fulfilled. E.g.</li>", "is fulfilled.</li>"),
    ],
}

GLOBAL_FIXES = [
    ("in other to", "in order to"),
    ("In other to", "In order to"),
]


# ── the worked examples, as TeX ───────────────────────────────────────
def eq(*tex):
    """One display equation per line."""
    return "".join('<div class="eqn"><span class="tex">' + t + "</span></div>" for t in tex)


MATHS = {
    # ── inventory ──
    "TC = Pc + Oc + Ho + So = (Price × Quantity) + (D/Q)O + (Q/2)H (where (D/Q)O = ordering "
    "cost and (Q/2)H = holding cost)":
        eq(r"\mathrm{TC} = P_c + O_c + H_o + S_o = (\text{price} \times \text{quantity}) "
           r"+ \frac{D}{Q}O + \frac{Q}{2}H")
        + "<p>where <span class=\"tex-i\">\\frac{D}{Q}O</span> is the ordering cost and "
          "<span class=\"tex-i\">\\frac{Q}{2}H</span> the holding cost.</p>",

    "EOQ = √(2DO / H)": eq(r"\mathrm{EOQ} = \sqrt{\frac{2DO}{H}}"),

    "Demand = 600,000; O = ₦20; H = ₦0.70":
        eq(r"D = 600{,}000 \quad O = ₦20 \quad H = ₦0.70"),

    "EOQ = √(2DO/H) = √(2 × 600,000 × 20 / 0.70) = 5,855.400 ≈ 5,856 units":
        eq(r"\mathrm{EOQ} = \sqrt{\frac{2DO}{H}} = \sqrt{\frac{2 \times 600{,}000 \times 20}"
           r"{0.70}} = 5{,}855.4 \approx 5{,}856\;\text{units}"),

    "Number of times to order = 600,000 / 5,856 = 102.46 ≈ 103 times":
        eq(r"\text{Orders per year} = \frac{600{,}000}{5{,}856} = 102.46 \approx 103"),

    "How often, or interval in days: (5,856 / 600,000) × (360 / 1) = 3.5 ≈ 4 days":
        eq(r"\text{Interval} = \frac{5{,}856}{600{,}000} \times 360 = 3.5 \approx "
           r"4\;\text{days}"),

    "TIC = P × Q + (D/Q)O + (Q/2)H":
        eq(r"\mathrm{TIC} = P \times Q + \frac{D}{Q}O + \frac{Q}{2}H"),

    "= 50 × 600,000 + (600,000/5,856 × 20/1) + (5,856/2 × 0.70/1) = 30,000,000 + 2,049.2 "
    "+ 2,049.6 = ₦30,004,098.8k":
        eq(r"= 50 \times 600{,}000 + \frac{600{,}000}{5{,}856}(20) + "
           r"\frac{5{,}856}{2}(0.70)",
           r"= 30{,}000{,}000 + 2{,}049.2 + 2{,}049.6 = ₦30{,}004{,}098.8"),

    "EOQ = √(2 × 600,000 × 20 / 7.5) = 1,788.8 ≈ 1,789 units":
        eq(r"\mathrm{EOQ} = \sqrt{\frac{2 \times 600{,}000 \times 20}{7.5}} = 1{,}788.8 "
           r"\approx 1{,}789\;\text{units}"),

    "(D = 600,000; H = 15% of ₦50 = 7.5; O = ₦20)":
        eq(r"D = 600{,}000 \quad H = 15\% \;\text{of}\; ₦50 = 7.5 \quad O = ₦20"),

    # ── control charts ──
    "TC₁ = (50 × 600,000) + (600,000/1,000 × 20/1) + (1,000/2 × 0.70/1) = 30,012,350 "
    "TC₂ = (48 × 600,000) + (600,000/2,001 × 20/1) + (2,001/2 × 0.70) = 28,806,697.35 "
    "TC₃ = (45 × 600,000) + (600,000/4,001 × 20/1) + (4,001/2 × 0.70) = 27,004,399.6 "
    "TC₄ = (30 × 600,000) + (600,000/6,001 × 20/1) + (6,000/2 × 0.70) = 18,004,100.02 "
    "TC₅ = (45 × 5,856) + (5,856/4,001 × 20/1) + (4,001/2 × 0.70/1) = 264,949.62":
        eq(r"\mathrm{TC}_1 = (50 \times 600{,}000) + \frac{600{,}000}{1{,}000}(20) + "
           r"\frac{1{,}000}{2}(0.70) = 30{,}012{,}350",
           r"\mathrm{TC}_2 = (48 \times 600{,}000) + \frac{600{,}000}{2{,}001}(20) + "
           r"\frac{2{,}001}{2}(0.70) = 28{,}806{,}697.35",
           r"\mathrm{TC}_3 = (45 \times 600{,}000) + \frac{600{,}000}{4{,}001}(20) + "
           r"\frac{4{,}001}{2}(0.70) = 27{,}004{,}399.6",
           r"\mathrm{TC}_4 = (30 \times 600{,}000) + \frac{600{,}000}{6{,}001}(20) + "
           r"\frac{6{,}000}{2}(0.70) = 18{,}004{,}100.02",
           r"\mathrm{TC}_5 = (45 \times 5{,}856) + \frac{5{,}856}{4{,}001}(20) + "
           r"\frac{4{,}001}{2}(0.70) = 264{,}949.62"),

    "X̄-Chart: X̄ ± 3σ": "<p>X̄-chart:</p>" + eq(r"\bar{X} \pm 3\sigma"),

    "X̄ = (10 + 8 + 12 + 9 + 15 + 11 + 10) / 7 = 75 / 7 = 10.71":
        eq(r"\bar{X} = \frac{10 + 8 + 12 + 9 + 15 + 11 + 10}{7} = \frac{75}{7} = 10.71"),

    "σ = √{ [(10−10.71)² + (8−10.71)² + (12−10.71)² + (9−10.71)² + (15−10.71)² + "
    "(11−10.71)² + (10−10.71)²] / 7 } = 2.12":
        eq(r"\sigma = \sqrt{\frac{\Sigma(x − \bar{X})^2}{n}}",
           r"\Sigma(x − \bar{X})^2 = (10 − 10.71)^2 + (8 − 10.71)^2 + (12 − 10.71)^2 "
           r"+ (9 − 10.71)^2",
           r"\qquad + (15 − 10.71)^2 + (11 − 10.71)^2 + (10 − 10.71)^2 = 31.43",
           r"\sigma = \sqrt{\frac{31.43}{7}} = 2.12"),

    "X̄ + 3σ = 10.71 + 3(2.12) = 17.07 X̄ − 3σ = 10.71 − 3(2.12) = 4.35":
        eq(r"\bar{X} + 3\sigma = 10.71 + 3(2.12) = 17.07",
           r"\bar{X} − 3\sigma = 10.71 − 3(2.12) = 4.35"),

    "R̄-Chart (with range): X̄ ± A₂R̄":
        "<p>R̄-chart, with the mean:</p>" + eq(r"\bar{X} \pm A_2\bar{R}"),

    "R̄-Chart (without range): UCL = D₄R̄ LCL = D₃R̄":
        "<p>R̄-chart, without the mean:</p>"
        + eq(r"\mathrm{UCL} = D_4\bar{R} \qquad \mathrm{LCL} = D_3\bar{R}"),

    "A₂ = 0.58 D₃ = 0 D₄ = 2.11":
        eq(r"A_2 = 0.58 \quad D_3 = 0 \quad D_4 = 2.11"),

    "X̄̄ = 76 / 10 = 7.6 R̄ = 26 / 10 = 2.6":
        eq(r"\bar{\bar{X}} = \frac{76}{10} = 7.6 \qquad \bar{R} = \frac{26}{10} = 2.6"),

    "i) X̄̄ ± A₂R̄ 7.6 + 0.58(2.6) = 9.108 7.6 − 0.58(2.6) = 6.092":
        "<p>i) With the mean:</p>"
        + eq(r"\bar{\bar{X}} \pm A_2\bar{R}",
             r"7.6 + 0.58(2.6) = 9.108 \qquad 7.6 − 0.58(2.6) = 6.092"),

    "ii) Without Range UCL = D₄R̄ = 2.11(2.6) = 5.486 LCL = D₃R̄ = 0(2.6) = 0":
        "<p>ii) Without the mean:</p>"
        + eq(r"\mathrm{UCL} = D_4\bar{R} = 2.11(2.6) = 5.486",
             r"\mathrm{LCL} = D_3\bar{R} = 0(2.6) = 0"),

    "X̄ ± 3(σ/√n)": eq(r"\bar{X} \pm 3\left(\frac{\sigma}{\sqrt{n}}\right)"),

    "n = 2.5 X̄ = 2 σ = 0.1": eq(r"n = 2.5 \quad \bar{X} = 2 \quad \sigma = 0.1"),

    "UCL = X̄ + 3(σ/√n) = 2 + 3(0.1/√2.5) = 2.06":
        eq(r"\mathrm{UCL} = \bar{X} + 3\left(\frac{\sigma}{\sqrt{n}}\right) = 2 + "
           r"3\left(\frac{0.1}{\sqrt{2.5}}\right) = 2.06"),

    "LCL = X̄ − 3(σ/√n) = 2 − 3(0.1/√2.5) = 1.94":
        eq(r"\mathrm{LCL} = \bar{X} − 3\left(\frac{\sigma}{\sqrt{n}}\right) = 2 - "
           r"3\left(\frac{0.1}{\sqrt{2.5}}\right) = 1.94"),

    # ── project evaluation ──
    "PBP = Initial Investment / Annual Cash Flow = ₦40,000 / ₦10,000 = 4 years (Is it "
    "feasible? Yes)":
        eq(r"\mathrm{PBP} = \frac{\text{initial investment}}{\text{annual cash flow}} = "
           r"\frac{₦40{,}000}{₦10{,}000} = 4\;\text{years}")
        + "<p>Is it feasible? Yes.</p>",

    "Project A = ₦700,000 / ₦225,000 = 3.18 years":
        eq(r"\text{Project A: } \mathrm{PBP} = \frac{₦700{,}000}{₦225{,}000} = "
           r"3.18\;\text{years}"),

    "Project B = ₦400,000 / ₦110,000 = 3.6 years":
        eq(r"\text{Project B: } \mathrm{PBP} = \frac{₦400{,}000}{₦110{,}000} = "
           r"3.6\;\text{years}"),

    "ARR = Annual Cash Flow / Savings ÷ Initial Investment / Cost":
        eq(r"\mathrm{ARR} = \frac{\text{annual cash flow or savings}}"
           r"{\text{initial investment or cost}}"),

    "ARR = 10,000 / 40,000 = 0.25 × 100% = 25%":
        eq(r"\mathrm{ARR} = \frac{10{,}000}{40{,}000} = 0.25 \times 100\% = 25\%"),

    "Project A: ARR = 10,000 / 20,000 = 0.5 × 100 = 50%":
        eq(r"\text{Project A: } \mathrm{ARR} = \frac{10{,}000}{20{,}000} = 0.5 \times "
           r"100\% = 50\%"),

    "Project B: ARR = 10,000 / 30,000 = 0.33 × 100 = 33%":
        eq(r"\text{Project B: } \mathrm{ARR} = \frac{10{,}000}{30{,}000} = 0.33 \times "
           r"100\% = 33\%"),

    "408,960 − 40,000 = ₦368,960":
        eq(r"\mathrm{NPV} = 408{,}960 − 40{,}000 = ₦368{,}960"),

    "FV = PV(1 + r)ⁿ PV = FV / (1 + r)ⁿ = FV(1 + r)⁻ⁿ":
        eq(r"\mathrm{FV} = \mathrm{PV}(1 + r)^n",
           r"\mathrm{PV} = \frac{\mathrm{FV}}{(1 + r)^n} = \mathrm{FV}(1 + r)^{−n}"),
}


# ── applying it ───────────────────────────────────────────────────────
class Miss(Exception):
    pass


def typography(html):
    for pat, rep in TYPO:
        html = re.sub(pat, rep, html)
    return re.sub(r"  +", " ", html)


def shorthand(text):
    for pat, rep in SHORTHAND:
        text = re.sub(pat, rep, text)
    return text


def wording(html, doc_id, used):
    for old, new in FIXES.get(doc_id, []):
        if old in html:
            html = html.replace(old, new)
            used.add((doc_id, old))
    for old, new in GLOBAL_FIXES:
        html = html.replace(old, new)
    return html


def check(used):
    """Every per-document fix must have fired somewhere."""
    missed = [(d, o) for d, fixes in FIXES.items() for o, _ in fixes
              if (d, o) not in used]
    if missed:
        raise Miss("corrections that no longer match:\n  "
                   + "\n  ".join(d + ": " + o for d, o in missed))
