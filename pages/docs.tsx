import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FileText, Folder, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";

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

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/docs");
      const data = await res.json();
      // API returns array directly from createHandler
      setDocs(Array.isArray(data) ? data : data.docs || []);
    } catch (err) {
      console.error("Failed to fetch docs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

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

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Docs</h1>
          <Button variant="outline" size="sm" onClick={fetchDocs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Project Documentation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Hand-written project files: specs, tickets, READMEs, and deliverables.
              Kept separate from auto-generated memory.
            </p>
            
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : docs.length === 0 ? (
              <div className="text-sm text-muted-foreground">No docs found in workspace.</div>
            ) : (
              <div className="space-y-1">
                {docs.map((doc) => (
                  <div
                    key={doc.path}
                    className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer group"
                    onClick={() => window.open(`file://${doc.path}`, "_blank")}
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
    </Layout>
  );
}