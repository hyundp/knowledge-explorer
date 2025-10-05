"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Newspaper, Lightbulb, Mail, FileText, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { ExternalContent } from "@/lib/types";

// Tags to filter out - using regex for better matching
const EXCLUDED_TAG_PATTERNS = [
  /biological.*physical.*sciences/i,
  /science.*research/i,
  /uncategorized/i,
  /for researchers/i,
  /science divisions/i
];

export function ExternalContextPanel() {
  const [externalContent, setExternalContent] = useState<ExternalContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsPage, setNewsPage] = useState(1);
  const [explainerPage, setExplainerPage] = useState(1);
  const [newsletterPage, setNewsletterPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    // Fetch external content from real data API
    fetch('/api/external')
      .then(res => res.json())
      .then((content) => {
        setExternalContent(content);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching external content:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Loading NASA content...</p>
        </CardContent>
      </Card>
    );
  }

  const getIcon = (type: ExternalContent["type"]) => {
    switch (type) {
      case "news":
        return <Newspaper className="h-4 w-4" />;
      case "explainer":
        return <Lightbulb className="h-4 w-4" />;
      case "newsletter":
        return <Mail className="h-4 w-4" />;
      case "library_record":
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: ExternalContent["type"]) => {
    switch (type) {
      case "news":
        return "News";
      case "explainer":
        return "Explainer";
      case "newsletter":
        return "Newsletter";
      case "library_record":
        return "Library";
    }
  };

  // Function to clean tags
  const cleanTags = (tags: string[]) => {
    return tags
      .map(tag => {
        // Clean HTML entities
        return tag
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, ' ')
          .trim();
      })
      .filter(tag => {
        // Filter out excluded patterns
        const cleanedTag = tag.toLowerCase();
        return !EXCLUDED_TAG_PATTERNS.some(pattern => pattern.test(cleanedTag));
      })
      .filter(tag => tag.length > 2) // Remove very short tags
      .slice(0, 3); // Only show top 3 tags
  };

  // Group content by type
  const news = externalContent.filter((c) => c.type === "news");
  const explainers = externalContent.filter((c) => c.type === "explainer");
  const newsletters = externalContent.filter((c) => c.type === "newsletter");

  // Paginate content
  const paginateContent = (content: ExternalContent[], page: number) => {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return content.slice(start, end);
  };

  const renderContentItem = (item: ExternalContent, idx: number, buttonText: string = "Read More") => (
    <div
      key={idx}
      className="rounded-lg border border-[rgba(0,180,216,0.3)] bg-[rgba(11,14,19,0.95)] p-3 transition-all hover:border-[var(--earth-blue)] hover:shadow-[0_0_15px_rgba(0,180,216,0.2)] cursor-pointer"
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          {getIcon(item.type)}
          <span className="text-xs font-bold uppercase text-[var(--solar-gold)]">
            {getTypeLabel(item.type)}
          </span>
        </div>
        <span className="text-xs text-[var(--lunar-gray)]">
          {new Date(item.published_at).toLocaleDateString()}
        </span>
      </div>
      <h4 className="mb-2 font-semibold leading-tight text-white">{item.title}</h4>
      <p className="mb-3 text-sm text-[var(--lunar-gray)]">{item.summary}</p>
      {item.tags.length > 0 && cleanTags(item.tags).length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {cleanTags(item.tags).map((tag, i) => (
            <span
              key={i}
              className="rounded-full bg-[var(--nasa-blue)] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider border border-[rgba(11,61,145,0.5)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          // Open the source_url directly from the data
          const url = item.source_url.startsWith('http')
            ? item.source_url
            : `https://${item.source_url}`;
          window.open(url, "_blank");
        }}
        className="h-6 px-2 text-[9px]"
        title={item.type === 'newsletter' ? 'Open newsletter' : 'Open article'}
      >
        {buttonText}
        <ArrowRight className="ml-1 h-2.5 w-2.5" />
      </Button>
    </div>
  );

  const renderPagination = (
    currentPage: number,
    totalItems: number,
    setPage: (page: number) => void
  ) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;

    return (
      <div className="mt-4 flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex gap-1 items-center">
          {(() => {
            const pages = [];
            const maxVisible = 5;

            if (totalPages <= maxVisible + 1) {
              // Show all pages if total is small
              for (let i = 1; i <= totalPages; i++) {
                pages.push(
                  <Button
                    key={i}
                    variant={currentPage === i ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(i)}
                    className="h-8 w-8 text-xs"
                  >
                    {i}
                  </Button>
                );
              }
            } else {
              // Complex pagination with ellipsis
              if (currentPage <= maxVisible - 1) {
                // Current page is in the beginning
                for (let i = 1; i <= maxVisible; i++) {
                  pages.push(
                    <Button
                      key={i}
                      variant={currentPage === i ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(i)}
                      className="h-8 w-8 text-xs"
                    >
                      {i}
                    </Button>
                  );
                }
                pages.push(
                  <span key="ellipsis" className="px-2 text-[var(--lunar-gray)]">
                    ...
                  </span>
                );
              } else if (currentPage >= totalPages - 2) {
                // Current page is near the end
                pages.push(
                  <Button
                    key={1}
                    variant={currentPage === 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(1)}
                    className="h-8 w-8 text-xs"
                  >
                    1
                  </Button>
                );
                pages.push(
                  <span key="ellipsis" className="px-2 text-[var(--lunar-gray)]">
                    ...
                  </span>
                );
                for (let i = totalPages - 3; i <= totalPages; i++) {
                  pages.push(
                    <Button
                      key={i}
                      variant={currentPage === i ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(i)}
                      className="h-8 w-8 text-xs"
                    >
                      {i}
                    </Button>
                  );
                }
              } else {
                // Current page is in the middle
                pages.push(
                  <Button
                    key={1}
                    variant={currentPage === 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(1)}
                    className="h-8 w-8 text-xs"
                  >
                    1
                  </Button>
                );
                pages.push(
                  <span key="ellipsis-1" className="px-2 text-[var(--lunar-gray)]">
                    ...
                  </span>
                );
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                  pages.push(
                    <Button
                      key={i}
                      variant={currentPage === i ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(i)}
                      className="h-8 w-8 text-xs"
                    >
                      {i}
                    </Button>
                  );
                }
                pages.push(
                  <span key="ellipsis-2" className="px-2 text-[var(--lunar-gray)]">
                    ...
                  </span>
                );
              }

              // Always add END button for last page
              pages.push(
                <Button
                  key="end"
                  variant={currentPage === totalPages ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(totalPages)}
                  className="h-8 px-3 text-xs font-bold tracking-wider"
                >
                  END
                </Button>
              );
            }

            return pages;
          })()}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <Tabs defaultValue="news" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="news" className="flex-1 cursor-pointer">
          News ({news.length})
        </TabsTrigger>
        <TabsTrigger value="explainers" className="flex-1 cursor-pointer">
          Explainers ({explainers.length})
        </TabsTrigger>
        <TabsTrigger value="newsletters" className="flex-1 cursor-pointer">
          Newsletters ({newsletters.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="news" className="mt-4">
        <div className="space-y-3">
          {paginateContent(news, newsPage).map((item, idx) =>
            renderContentItem(item, idx, "Read News")
          )}
        </div>
        {renderPagination(newsPage, news.length, setNewsPage)}
      </TabsContent>

      <TabsContent value="explainers" className="mt-4">
        <div className="space-y-3">
          {paginateContent(explainers, explainerPage).map((item, idx) =>
            renderContentItem(item, idx, "Read Explainer")
          )}
        </div>
        {renderPagination(explainerPage, explainers.length, setExplainerPage)}
      </TabsContent>

      <TabsContent value="newsletters" className="mt-4">
        <div className="space-y-3">
          {paginateContent(newsletters, newsletterPage).map((item, idx) =>
            renderContentItem(item, idx, "Read Newsletter")
          )}
        </div>
        {renderPagination(newsletterPage, newsletters.length, setNewsletterPage)}
      </TabsContent>
    </Tabs>
  );
}