// ============================================================
// RITUALS — Memory Algorithm (SM-2 SRS + i+1 Depth)
// ============================================================

export const ALGO_CONFIG = {
  scoringWeights: {
    keywordMatch: 0.60,
    responseDepth: 0.25,
    conceptClarity: 0.15
  },
  meaningfulMinKeywords: 2,
  meaningfulRatioThreshold: 0.25,
  scoreThresholds: {
    strong: 55,
    medium: 25
  },
  srsConfig: {
    minEF: 1.3,
    maxEF: 3.0,
    initialInterval: 1,
    secondInterval: 4,
    efDelta: {
      strong: 0.15,
      medium: 0.0,
      weak: -0.25
    }
  },
  iPlus1Config: {
    depthToUnlockNext: 3,
    maxDepth: 5,
    depthLabels: ["Introduced", "Recognized", "Recalled", "Fluent", "Mastered", "Anchored"]
  }
};

export type RecallLevel = 'strong' | 'medium' | 'weak';

export interface EvalResult {
  score: number;
  level: RecallLevel;
  emoji: string;
  label: string;
  sublabel: string;
  hitKeywords: string[];
  missKeywords: string[];
  highlightedHtml: string;
  correction: string;
  referenceAnswer: string;
  isMeaningful: boolean;
}

export const RecallEngine = {
  evaluate(userText: string, anchor: any): EvalResult {
    const text = (userText || "").trim();
    const words = text.split(/\s+/).filter(Boolean);
    const lower = text.toLowerCase();

    if (words.length < 3) {
      return this._emptyResult(anchor);
    }

    const hits = anchor.keywords.filter((kw: string) => lower.includes(kw.toLowerCase()));
    const misses = anchor.keywords.filter((kw: string) => !lower.includes(kw.toLowerCase()));
    const kwRatio = hits.length / Math.max(anchor.keywords.length, 1);

    const isMeaningful = hits.length >= ALGO_CONFIG.meaningfulMinKeywords || kwRatio >= ALGO_CONFIG.meaningfulRatioThreshold;

    if (!isMeaningful) {
      return this._insufficientResult(anchor, hits, misses);
    }

    const depthScore = Math.min(words.length / 50, 1.0);
    const anchorMentioned = lower.includes(anchor.word.toLowerCase()) ? 1 : 0.5;

    const { keywordMatch, responseDepth, conceptClarity } = ALGO_CONFIG.scoringWeights;
    const rawScore = (kwRatio * keywordMatch) + (depthScore * responseDepth) + (anchorMentioned * conceptClarity);
    const score = Math.round(rawScore * 100);

    const level = this._scoreToLevel(score);
    const correction = this._buildCorrection(score, hits, misses, anchor);

    return {
      score,
      level,
      emoji: this._emoji(level),
      label: this._label(level),
      sublabel: this._sublabel(level, score),
      hitKeywords: hits,
      missKeywords: misses.slice(0, 5),
      highlightedHtml: this._highlight(userText, hits),
      correction,
      referenceAnswer: anchor.reference_answer,
      isMeaningful: true
    };
  },

  _scoreToLevel(score: number): RecallLevel {
    if (score >= ALGO_CONFIG.scoreThresholds.strong) return "strong";
    if (score >= ALGO_CONFIG.scoreThresholds.medium) return "medium";
    return "weak";
  },

  _buildCorrection(score: number, hits: string[], misses: string[], anchor: any) {
    const lines = [];
    if (misses.length === 0) lines.push("✦ You covered all key concepts — excellent depth.");
    else if (misses.length <= 2) lines.push(`✦ Nearly complete. Missed concepts: ${misses.slice(0, 2).map(k => `"${k}"`).join(", ")}.`);
    else lines.push(`✦ Partial connection. Key gaps: ${misses.slice(0, 3).map(k => `"${k}"`).join(", ")}.`);

    if (score >= 80) lines.push("✦ Response depth is strong — clear conceptual understanding.");
    else lines.push("✦ Try to write more specifically to deepen the anchor.");

    return lines.join("\n");
  },

  _highlight(text: string, hits: string[]) {
    let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const sorted = [...hits].sort((a, b) => b.length - a.length);
    sorted.forEach(kw => {
      const re = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      html = html.replace(re, `<span class="font-semibold text-emerald-600 bg-emerald-50 px-1 rounded">$1</span>`);
    });
    return html.replace(/\n/g, "<br>");
  },

  _emptyResult(anchor: any): EvalResult {
    return {
      score: 0, level: 'weak', emoji: "💭", label: "Too Brief",
      sublabel: "Write at least a sentence about what you know.",
      hitKeywords: [], missKeywords: anchor.keywords.slice(0, 3),
      highlightedHtml: "No text written",
      correction: "✦ Write anything — even a rough idea counts as an attempt.",
      referenceAnswer: anchor.reference_answer, isMeaningful: false
    };
  },

  _insufficientResult(anchor: any, hits: string[], misses: string[]): EvalResult {
    return {
      score: 10, level: 'weak', emoji: "🌱", label: "Needs More",
      sublabel: "Your response didn't connect enough key ideas yet.",
      hitKeywords: hits, missKeywords: misses.slice(0, 4),
      highlightedHtml: "Response too vague",
      correction: `✦ Try to use more specific terms. Hints: ${anchor.keywords.slice(0, 3).join(", ")}.`,
      referenceAnswer: anchor.reference_answer, isMeaningful: false
    };
  },

  _emoji(l: RecallLevel) { return { strong: "🌟", medium: "🔆", weak: "🌱" }[l]; },
  _label(l: RecallLevel) { return { strong: "Strong Recall", medium: "Partial Recall", weak: "Weak Recall" }[l]; },
  _sublabel(l: RecallLevel, s: number) {
    if (l === "strong") return `Score ${s}/100 — solid memory connection.`;
    if (l === "medium") return `Score ${s}/100 — partial connection.`;
    return `Score ${s}/100 — this needs reinforcement.`;
  }
};

export const SRSEngine = {
  update(progress: any, result: { score: number, level: RecallLevel }) {
    const cfg = ALGO_CONFIG.srsConfig;
    const ip1 = ALGO_CONFIG.iPlus1Config;

    let { easiness_factor: ef, interval_days: interval, repetitions, concept_depth } = progress;
    const level = result.level;

    if (level === "weak") {
      repetitions = 0;
      interval = cfg.initialInterval;
    } else {
      if (repetitions === 0) interval = cfg.initialInterval;
      else if (repetitions === 1) interval = cfg.secondInterval;
      else interval = Math.round(interval * ef);
      repetitions++;
    }

    ef = ef + cfg.efDelta[level];
    ef = Math.max(cfg.minEF, Math.min(cfg.maxEF, ef));

    if (level === "strong" && concept_depth < ip1.maxDepth) {
      if (repetitions % ip1.depthToUnlockNext === 0) {
        concept_depth = Math.min(concept_depth + 1, ip1.maxDepth);
      }
    } else if (level === "weak" && concept_depth > 0) {
      concept_depth--;
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + interval);

    return {
      easiness_factor: parseFloat(ef.toFixed(3)),
      interval_days: interval,
      repetitions,
      concept_depth,
      due_at: dueDate.toISOString(),
      last_score: result.score,
      last_level: level
    };
  },

  depthLabel(depth: number) {
    return ALGO_CONFIG.iPlus1Config.depthLabels[depth] || "Anchored";
  }
};

export const MemoryFadeEngine = {
  /**
   * Calculates the assistance visibility level (0.0 to 1.0)
   * based on the current repetition count.
   * 
   * Logic:
   * Rep 0: 1.0 (Full visibility)
   * Rep 1: 0.7
   * Rep 2: 0.4
   * Rep 3: 0.1
   * Rep 4+: 0.0 (Manual peek only)
   */
  getAssistanceLevel(repetitions: number): number {
    if (repetitions <= 0) return 1.0;
    if (repetitions === 1) return 0.6;
    if (repetitions === 2) return 0.3;
    if (repetitions === 3) return 0.1;
    return 0.0;
  },

  getFadeClass(repetitions: number): string {
    const level = this.getAssistanceLevel(repetitions);
    if (level >= 0.8) return "opacity-100";
    if (level >= 0.5) return "opacity-60";
    if (level >= 0.2) return "opacity-30";
    if (level > 0) return "opacity-10";
    return "opacity-0 blur-sm hover:opacity-100 hover:blur-none transition-all duration-500 cursor-help";
  }
};
