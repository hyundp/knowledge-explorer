import type { GapCell, Paper, Finding, Consensus } from "./types";

// Export gap analysis data to CSV
export function exportGapToCSV(cells: GapCell[], filename: string = "gap-analysis.csv") {
  const headers = ["Organism", "Tissue", "Exposure", "Duration", "Study Count", "Avg Evidence Strength", "PMCIDs"];

  const rows = cells.map((cell) => [
    cell.organism,
    cell.tissue,
    cell.exposure,
    cell.duration,
    cell.study_count.toString(),
    cell.avg_evidence_strength.toFixed(2),
    cell.pmcids.join("; "),
  ]);

  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

  downloadFile(csv, filename, "text/csv");
}

// Export papers to CSV
export function exportPapersToCSV(papers: Paper[], filename: string = "papers.csv") {
  const headers = ["PMCID", "Title", "Authors", "Year", "Journal", "DOI"];

  const rows = papers.map((paper) => [
    paper.pmcid,
    `"${paper.title.replace(/"/g, '""')}"`,
    `"${paper.authors.join("; ")}"`,
    paper.year,
    paper.journal,
    paper.doi,
  ]);

  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

  downloadFile(csv, filename, "text/csv");
}

// Export findings to CSV
export function exportFindingsToCSV(findings: Finding[], filename: string = "findings.csv") {
  const headers = [
    "Finding ID",
    "PMCID",
    "Phenotype",
    "Direction",
    "Magnitude",
    "P-value",
    "Tissue",
    "Organism",
    "Exposure",
    "Duration",
    "Assay",
    "Sample Size",
    "Evidence Strength",
  ];

  const rows = findings.map((finding) => [
    finding.finding_id,
    finding.pmcid,
    finding.phenotype.label,
    finding.direction,
    finding.magnitude ? `${finding.magnitude.value} ${finding.magnitude.unit}` : "",
    finding.p_value?.toString() || "",
    finding.tissue?.label || "",
    finding.organism.label,
    finding.exposure.type,
    `${finding.duration.value} ${finding.duration.unit}`,
    finding.assay.label,
    finding.sample_size.toString(),
    finding.evidence_strength.toFixed(2),
  ]);

  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

  downloadFile(csv, filename, "text/csv");
}

// Export consensus data to CSV
export function exportConsensusToCSV(consensus: Consensus, filename: string = "consensus.csv") {
  const headers = [
    "PMCID",
    "Title",
    "Year",
    "Direction",
    "Magnitude",
    "CI Lower",
    "CI Upper",
    "P-value",
    "Sample Size",
  ];

  const rows = consensus.effect_sizes.map((effect) => [
    effect.pmcid,
    `"${effect.title.replace(/"/g, '""')}"`,
    effect.year,
    effect.direction,
    effect.magnitude.toFixed(2),
    effect.ci_lower.toFixed(2),
    effect.ci_upper.toFixed(2),
    effect.p_value.toFixed(4),
    effect.sample_size.toString(),
  ]);

  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

  downloadFile(csv, filename, "text/csv");
}

// Export data to JSON
export function exportToJSON(data: unknown, filename: string = "data.json") {
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, filename, "application/json");
}

// Helper function to trigger download
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export current view as PNG (using html2canvas)
export async function exportToPNG(elementId: string, filename: string = "screenshot.png") {
  // This would require html2canvas library
  // For now, just show a message
  alert("PNG export requires html2canvas library. Install with: npm install html2canvas");
}
