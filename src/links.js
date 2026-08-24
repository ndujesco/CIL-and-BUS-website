/* Sources that are not in the course folder.

   A question's source line is a list of labels. A label naming one of the
   course documents opens it; a label listed here opens a page on the web
   instead. Two kinds of label end up here:

     · points the 2024/25 BUS paper examined that the 2025/26 materials do
       not cover — organisational change, conflict, the environment of
       business, Garvin's dimensions of quality, ABC analysis, safety stock,
       acceptance sampling, crashing a schedule
     · the cases and statutes the CIL notes cite by name

   Every URL was checked. Keep each key identical, character for character,
   to the label used in the question's s: field, or it will not resolve. */
var LINKS = {
  /* BUS 440: examined, but not in the six blocks */
  "Eight dimensions of quality": "https://en.wikipedia.org/wiki/Eight_dimensions_of_quality",
  "Change management":           "https://en.wikipedia.org/wiki/Change_management",
  "Organisational conflict":     "https://en.wikipedia.org/wiki/Organizational_conflict",
  "Business environment":        "https://en.wikipedia.org/wiki/Market_environment",
  "Acceptance sampling":         "https://en.wikipedia.org/wiki/Acceptance_sampling",
  "Safety stock":                "https://en.wikipedia.org/wiki/Safety_stock",
  "ABC analysis":                "https://en.wikipedia.org/wiki/ABC_analysis",
  "Critical path method":        "https://en.wikipedia.org/wiki/Critical_path_method",

  /* CIL 524: the cases and the Act the classes name */
  "Stilk v Myrick": "https://en.wikipedia.org/wiki/Stilk_v_Myrick",
  "Pinnel's case":  "https://en.wikipedia.org/wiki/Pinnel%27s_Case",
  /* Not in the 2025/26 materials — this case is named only in a past-question
     answer (cil-pq Q65), not in any class or slide deck. Linked here so the
     citation resolves instead of reading as an uncited claim. */
  "Lloyd’s Bank Ltd v. Bundy": "https://en.wikipedia.org/wiki/Lloyds_Bank_Ltd_v_Bundy",
  "S.12": "https://en.wikipedia.org/wiki/Sale_of_Goods_Act_1893",
  "S.13": "https://en.wikipedia.org/wiki/Sale_of_Goods_Act_1893",
  "S.14": "https://en.wikipedia.org/wiki/Sale_of_Goods_Act_1893",
  "S.15": "https://en.wikipedia.org/wiki/Sale_of_Goods_Act_1893"
};
