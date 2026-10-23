// Types for dist/grade8-chemistry.content.json — the Grade 8 revision hub content pack.
// Independent of the lab module: nothing here imports or modifies lab code.

export type Level = "easy" | "medium" | "hard";

export type Block =
  | { t: "p" | "eq" | "tip" | "warn" | "fact" | "errata"; x: string }
  | { t: "list" | "steps"; items: string[] }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "key"; term: string; x: string }
  | { t: "ex"; q: string; a: string }
  | { t: "fig"; name: FigureName; args?: Record<string, unknown>; cap?: string };

export type FigureName =
  | "meniscus" | "saltflow" | "models" | "bohr" | "atombuilder" | "pt20" | "series"
  | "displacer" | "rategraph" | "collision" | "surface" | "exoendo" | "method" | "pm" | "timeline";

/** Inline markup inside strings: **bold**, *italic*, H_2SO_4 (subscript), SO_4^2- (superscript), {{nuc:A:Z:X}} (nuclide). */
export type RichText = string;

export interface Note { id: string; title: string; blocks: Block[] }
export interface Flashcard { id: string; front: RichText; back: RichText }
export interface MCQ { id: string; question: RichText; options: RichText[]; answer: number; explanation: RichText }
export interface QuestionPart { label: string; prompt: RichText; marks: number; scheme: RichText[]; model: RichText }
export interface StructuredQuestion { id: string; level: Level; stem: RichText; totalMarks: number; parts: QuestionPart[] }
export interface Practical {
  id: string; title: string; ref: string; aim: string; steps: string[]; safety: string; result: string;
  /** Fill with the matching ID from the existing 30 Grade 8 lab guides to deep-link. Null = no link. */
  labActivityId: string | null;
}
export interface Objective { id: string; text: string }

export interface Topic {
  id: string; chapterId: string; title: string; bookPages: string;
  objectives: Objective[]; keyTerms: string[]; notes: Note[];
  flashcards: Flashcard[]; quiz: MCQ[]; questions: StructuredQuestion[]; practicals: Practical[];
}
export interface Chapter { id: string; num: string; title: string; pages: string; summary: string; topicIds: string[] }

export interface ContentPack {
  meta: {
    id: string; title: string; grade: number; curriculum: string; version: string; note: string;
    reference: { book: string; edition: string; isbn: string };
    counts: Record<string, number>;
  };
  chapters: Chapter[];
  topics: Topic[];
  glossary: { term: string; definition: string; topicId: string }[];
  errata: { topicId: string; noteId: string; text: string }[];
  elements: Element[];
  tables: RefTable[];
  lab: LabPack;
}
export interface Element {
  z: number; symbol: string; name: string; mass: string;
  category: "am" | "ae" | "tm" | "pt" | "md" | "nm" | "hl" | "ng" | "ln" | "an";
  state: "s" | "l" | "g" | "u"; period: number; group: number | null; fRow: "ln" | "an" | null;
  /** Computed in the build (Madelung order + exceptions such as Cr, Cu). [subshell, electrons] */
  config: [string, number][];
  /** Electrons per shell, innermost first. */
  shells: number[];
  block: "s" | "p" | "d" | "f";
  /** Illustration style for the element sample. */
  look: "gas" | "glow" | "oil" | "metal" | "powder" | "lumps" | "crystal" | "liquid" | "radio" | "radgas" | "synth";
  /** Hex colour used by the sample illustration. */
  color: string;
  /** One-line everyday use (Mongolian). */
  use: string;
}

/* ---------- Lab skills (hub side only; links to the 3D lab by labActivityId) ---------- */
export interface Apparatus { id: string; name: string; use: string; topic: string }
export interface ObservationVisual {
  from?: string; to?: string; ppt?: string; gas?: boolean;
  flame?: boolean | string; powderFrom?: string; powderTo?: string; strip?: [string, string];
}
export interface Observation { id: string; topic: string; q: RichText; a: RichText; vis: ObservationVisual }
export interface Hazard {
  id: string; sym: "excl" | "corr" | "flame" | "skull" | "oxid" | "env" | "health";
  name: string; meaning: string; ex: string; act: string;
}
/** A results column: numeric (min/max, optional dp) or ordinal (levels). */
export interface ResultColumn { h: string; min?: number; max?: number; dp?: number; levels?: string[] }
export interface ResultTable {
  /** Categorical rows (bar chart) ... */
  rows?: string[];
  /** ... or an x series (line chart). Exactly one of rows / x is present. */
  x?: { h: string; values: number[] };
  cols: ResultColumn[];
  /** Derived column = last col minus first col (e.g. ΔT). */
  derive?: { h: string };
  /** Plausible example data, one array per row / x value. */
  sample: (number | string)[][];
  chart: "bar" | "line";
}
/** i = independent, d = dependent, c = control variable */
export type VariableRole = "i" | "d" | "c";
export interface StructuredPractical {
  predict: RichText;
  vars: [string, VariableRole][];
  safety: { q: RichText; o: RichText[]; a: number };
  table: ResultTable;
  /** Named auto-check rule implemented in the UI (see resCheck() in the demo). */
  check: "range" | "ice" | "caGtMg" | "decreasing" | "falling" | "conc" | "rise" | "fall";
  /** Conclusion question: prompt, marks, mark-scheme points (length === m). */
  concl: { p: RichText; m: number; s: RichText[] };
}
export interface LabPack {
  apparatus: Apparatus[];
  observations: Observation[];
  hazards: Hazard[];
  /** Keyed by Practical.id, e.g. "1.1-prac1". 8 of 23 practicals have this. */
  structured: Record<string, StructuredPractical>;
}
export interface RefTable { id: string; title: string; topicId: string; head: string[]; rows: string[][]; note?: string }
