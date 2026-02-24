import Layout from "@/components/Layout";
import { useState, useEffect } from "react";
import { useCounts } from "@/lib/counts-context";
import { Database, BarChart2, ShoppingBag, Globe, Cpu, Radio, Settings } from "lucide-react";
import type { Credential } from "@/lib/types";

const CATEGORY_ORDER = ["Databases", "Analytics", "Commerce", "Google", "AI Tools", "Channels", "System"];
const CATEGORY_ICON: Record<string, React.ElementType> = {
  Databases:  Database,
  Analytics:  BarChart2,
  Commerce:   ShoppingBag,
  Google:     Globe,
  "AI Tools": Cpu,
  Channels:   Radio,
  System:     Settings,
};

const STATUS_STYLE: Record<string, string> = {
  ok:      "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  empty:   "bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-300",
  missing: "bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-300",
};
const STATUS_LABEL: Record<string, string> = {
  ok:      "Connected",
  empty:   "Empty",
  missing: "Missing",
};

export default function CredentialsPage() {
  const { counts } = useCounts();
  const [creds, setCreds] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/credentials")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setCreds(d); else setError(d.error); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const byCategory = CATEGORY_ORDER.reduce<Record<string, Credential[]>>((acc, cat) => {
    acc[cat] = creds.filter(c => c.category === cat);
    return acc;
  }, {});

  const okCount = creds.filter(c => c.status === "ok").length;

  return (
    <Layout>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 sm:p-8 space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold">Credentials</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {loading ? "Loading…" : `${okCount} of ${creds.length} connected`}
          </p>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900 border border-red-200 text-red-700 px-4 py-3 rounded">Error: {error}</div>}

        {!loading && (
          <div className="space-y-6">
            {CATEGORY_ORDER.filter(cat => byCategory[cat]?.length > 0).map(cat => (
              <div key={cat}>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  {(() => { const Icon = CATEGORY_ICON[cat]; return Icon ? <Icon className="h-3.5 w-3.5" /> : null; })()}
                  {cat}
                </h2>
                <div className="rounded-lg border overflow-hidden">
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {byCategory[cat].map(cred => (
                      <div key={cred.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <div className="min-w-0">
                          <span className="text-sm font-medium">{cred.name}</span>
                          {cred.note && (
                            <span className="ml-2 text-xs text-muted-foreground">— {cred.note}</span>
                          )}
                          <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{cred.file}</div>
                        </div>
                        <div className="flex items-center gap-2 ml-4 shrink-0">
                          {cred.keys !== undefined && cred.status === "ok" && (
                            <span className="text-xs text-muted-foreground">{cred.keys} key{cred.keys !== 1 ? "s" : ""}</span>
                          )}
                          <span className={`text-xs font-medium px-2 py-1 rounded ${STATUS_STYLE[cred.status]}`}>
                            {STATUS_LABEL[cred.status]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
