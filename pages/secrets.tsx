import { PageInfo } from "@/components/PageInfo";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Shield, FileKey, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import type { SecretsAudit } from "./api/secrets-audit";

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === "error") return <AlertCircle className="h-4 w-4 text-red-600" />;
  if (severity === "warn") return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  return <CheckCircle className="h-4 w-4 text-blue-600" />;
}

function SeverityBadge({ severity }: { severity: string }) {
  const classes = {
    error: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200",
    warn: "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200",
    info: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${classes[severity as keyof typeof classes] || classes.info}`}>
      {severity}
    </span>
  );
}

export default function SecretsPage() {
  const [audit, setAudit] = useState<SecretsAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/secrets-audit")
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setAudit(d);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const summary = audit?.summary;
  const totalIssues = (summary?.plaintextCount || 0) + (summary?.unresolvedRefCount || 0) + (summary?.shadowedRefCount || 0);

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-4xl font-bold">Secrets</h1>
            <PageInfo page="secrets" />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {loading ? "…" : error ? "Audit unavailable" : totalIssues === 0 ? "All clear" : `${totalIssues} finding${totalIssues !== 1 ? "s" : ""}`}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded">
            Error: {error}
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground">Running audit…</p>
        ) : audit ? (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className={`text-xl sm:text-2xl font-semibold ${totalIssues === 0 ? "text-green-600" : "text-amber-600"}`}>
                    {totalIssues === 0 ? "Clean" : "Issues"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Plaintext</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className={`text-xl sm:text-2xl font-semibold ${summary?.plaintextCount ? "text-amber-600" : ""}`}>
                    {summary?.plaintextCount || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Unresolved</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className={`text-xl sm:text-2xl font-semibold ${summary?.unresolvedRefCount ? "text-red-600" : ""}`}>
                    {summary?.unresolvedRefCount || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Files Scanned</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xl sm:text-2xl font-semibold">{audit.filesScanned?.length || 0}</p>
                </CardContent>
              </Card>
            </div>

            {/* Findings */}
            {audit.findings?.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileKey className="h-4 w-4" />
                    Findings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {audit.findings.map((finding, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <SeverityIcon severity={finding.severity} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <SeverityBadge severity={finding.severity} />
                            <code className="text-xs font-mono text-muted-foreground">{finding.code}</code>
                            {finding.provider && (
                              <span className="text-xs text-muted-foreground">{finding.provider}</span>
                            )}
                          </div>
                          <p className="text-sm mt-1">{finding.message}</p>
                          <p className="text-xs text-muted-foreground font-mono truncate mt-1">
                            {finding.file.replace(process.env.HOME || "/Users/botbot", "~")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Files Scanned */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Files Scanned</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {audit.filesScanned?.map((file, i) => (
                    <p key={i} className="text-xs font-mono text-muted-foreground truncate">
                      {file.replace(process.env.HOME || "/Users/botbot", "~")}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Last Audit */}
            <p className="text-xs text-muted-foreground">
              Last audit: {audit.lastAuditAt ? new Date(audit.lastAuditAt).toLocaleString() : "unknown"}
            </p>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
