import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { FileText, Folder, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import Layout from "@/components/Layout";
import ReactMarkdown from "react-markdown";

interface DocFile {
  path: string;
  name: string;
  type: "file" | "folder";
  mtime: string;
  size?: number;
}

export default function DocsPage() {
  const [docs, setDocs] = useState<DocFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<DocFile | null>(null);
  const [docContent, setDocContent] = useState<string>("");
  const [contentLoading, setContentLoading] = useState(false);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/docs");
      const data = await res.json();
      setDocs(Array.isArray(data) ? data : data.docs || []);
    } catch (err) {
      console.error("Failed to fetch docs:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocContent = async (doc: DocFile) => {
    if (doc.type === "folder") return;
    setContentLoading(true);
    try {
      const res = await fetch(`/api/docs/content?path=${encodeURIComponent(doc.path)}`);
      const data = await res.json();
      setDocContent(data.content || "No content available.");
    } catch (err) {
      console.error("Failed to fetch doc content:", err);
      setDocContent("Failed to load content.");
    } finally {
      setContentLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  useEffect(() => {
    if (selectedDoc) {
      fetchDocContent(selectedDoc);
    } else {
      setDocContent("");
    }
  }, [selectedDoc]);

  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDocClick = (doc: DocFile) => {
    if (doc.type === "folder") {
      // Could expand folder or navigate - for now just skip
      return;
    }
    setSelectedDoc(doc);
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Docs</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Project documentation and deliverables
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDocs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Documentation Files</CardTitle>
            <CardDescription>
              Hand-written project files: specs, tickets, READMEs, and deliverables.
              Kept separate from auto-generated memory.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : docs.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No docs found in workspace.
              </div>
            ) : (
              <div className="space-y-1">
                {docs.map((doc) => (
                  <div
                    key={doc.path}
                    className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer group"
                    onClick={() => handleDocClick(doc)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {doc.type === "folder" ? (
                        <Folder className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="text-sm truncate" title={doc.path}>
                        {doc.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
                      {doc.size && <span>{formatSize(doc.size)}</span>}
                      <span>{formatDate(doc.mtime)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Doc content sidebar */}
      <Sheet open={!!selectedDoc} onOpenChange={(open) => !open && setSelectedDoc(null)}>
        <SheetContent side="right" className="w-[90%] sm:max-w-2xl overflow-y-auto">
          {selectedDoc && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <SheetTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    {selectedDoc.name}
                  </SheetTitle>
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </button>
                </div>
              </SheetHeader>
              <div className="px-6 pb-6">
                {contentLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{docContent}</ReactMarkdown>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Layout>
  );
}
