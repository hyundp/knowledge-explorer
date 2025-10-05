import type { Paper } from "@/lib/types";
import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";

interface PaperCardProps {
  paper: Paper;
  onViewDetails?: () => void;
}

export function PaperCard({ paper, onViewDetails }: PaperCardProps) {
  // Extract keywords from abstract (simplified example)
  const keywords = ["microgravity", "spaceflight", "radiation", "bone loss", "muscle atrophy"];
  const foundKeywords = keywords.filter(keyword =>
    paper.sections.abstract.toLowerCase().includes(keyword)
  ).slice(0, 3);

  return (
    <div className="rounded-lg border border-[rgba(0,180,216,0.3)] bg-[rgba(11,14,19,0.95)] p-3 transition-all hover:border-[var(--earth-blue)] hover:shadow-[0_0_15px_rgba(0,180,216,0.2)] cursor-pointer">
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded bg-[var(--solar-gold)] px-2 py-0.5 text-xs font-bold text-black uppercase tracking-wider">
            {paper.pmcid}
          </span>
          <span className="rounded bg-[var(--nasa-blue)] px-2 py-0.5 text-xs font-bold text-white uppercase">
            {paper.provenance.source_type}
          </span>
        </div>
        <span className="text-xs text-[var(--lunar-gray)]">
          {paper.year}
        </span>
      </div>

      <h4 className="mb-2 font-semibold leading-tight text-white line-clamp-2">{paper.title}</h4>

      <p className="mb-2 text-xs text-[var(--lunar-gray)]">
        {paper.authors.slice(0, 3).join(", ")}
        {paper.authors.length > 3 && " et al."} • {paper.journal}
      </p>

      <p className="mb-3 text-sm text-[var(--lunar-gray)] line-clamp-3">
        {paper.sections.abstract}
      </p>

      {/* Keywords/Tags */}
      {foundKeywords.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {foundKeywords.map((keyword) => (
            <span
              key={keyword}
              className="rounded-full bg-[var(--nasa-blue)] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider border border-[rgba(11,61,145,0.5)]"
            >
              {keyword}
            </span>
          ))}
        </div>
      )}

      <Button
        size="sm"
        variant="outline"
        onClick={() => window.open(paper.provenance.url, "_blank")}
        className="h-6 px-2 text-[9px]"
      >
        Read Paper
        <ArrowRight className="ml-1 h-2.5 w-2.5" />
      </Button>
    </div>
  );
}
