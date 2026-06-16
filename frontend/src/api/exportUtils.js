/**
 * CSV Export Utilities for Candidate Screenings.
 * Allows downloading of candidate tables and individual scorecards.
 */

const escapeField = (val) => {
  if (val === null || val === undefined) return "";
  const str = typeof val === "object" ? val.join(", ") : String(val);
  return `"${str.replace(/"/g, '""')}"`;
};

/**
 * Exports a list of ranked candidates to a CSV file.
 * @param {Array} results - The candidate results array.
 * @param {string} filename - Output file name.
 */
export function exportToCSV(results, filename = "ranked_candidates.csv") {
  if (!results || results.length === 0) return;

  const headers = [
    "Rank",
    "Candidate Name",
    "Email",
    "Phone",
    "Overall Score",
    "Vector Score",
    "Reranker Score",
    "Rules Score",
    "Skills",
    "AI Fit Summary",
    "Key Gaps"
  ];

  const rows = results.map(r => [
    r.rank,
    escapeField(r.candidate_name),
    escapeField(r.candidate_email || "N/A"),
    escapeField(r.candidate_phone || "N/A"),
    `${Math.round(r.final_score * 100)}%`,
    `${Math.round(r.vector_score * 100)}%`,
    `${Math.round(r.reranker_score * 100)}%`,
    `${Math.round(r.rule_score * 100)}%`,
    escapeField(r.skills || []),
    escapeField(r.explanation_fit || ""),
    escapeField(r.explanation_gap || "")
  ]);

  const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports a single candidate scorecard profile to a CSV file.
 * @param {Object} candidate - The candidate object.
 * @param {string} filename - Optional custom filename.
 */
export function exportCandidateToCSV(candidate, filename = null) {
  if (!candidate) return;

  const fname = filename || `${candidate.candidate_name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_scorecard.csv`;
  const headers = ["Metric", "Value"];

  const rows = [
    ["Candidate Name", candidate.candidate_name],
    ["Rank", candidate.rank],
    ["Email", candidate.candidate_email || "N/A"],
    ["Phone", candidate.candidate_phone || "N/A"],
    ["Overall AI Match Score", `${Math.round(candidate.final_score * 100)}%`],
    ["Vector Similarity Score", `${Math.round(candidate.vector_score * 100)}%`],
    ["Reranker Semantic Score", `${Math.round(candidate.reranker_score * 100)}%`],
    ["Rule-Based Bonus Score", `${Math.round(candidate.rule_score * 100)}%`],
    ["Key Extracted Skills", candidate.skills || []],
    ["AI Fit Assessment", candidate.explanation_fit || ""],
    ["Identified Gaps", candidate.explanation_gap || ""]
  ];

  const csvContent = [headers.join(","), ...rows.map(e => `${escapeField(e[0])},${escapeField(e[1])}`)].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fname);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
