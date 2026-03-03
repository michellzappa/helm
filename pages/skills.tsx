import { PageInfo } from "@/components/PageInfo";
import Layout from "@/components/Layout";
import { TableFilter } from "@/components/TableFilter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, Cpu, FileCode, Puzzle, X } from "lucide-react";
import { SortableTableHead } from "@/components/SortableTableHead";
import { sortData, getNextSortDirection, type SortDirection } from "@/lib/sorting";
import { useState, useEffect } from "react";
import { useCounts } from "@/lib/counts-context";
import ReactMarkdown from "react-markdown";


interface SkillModelLink {
  skill: string;
  script: string;
  model: string;
  source: "local" | "cloud";
  via: "ollama" | "cron" | "python" | "config";
}

interface Skill {
  name: string;
  description: string;
  path: string;
  location: "workspace" | "global" | "extension";
  workspace?: string;
  status: "enabled" | "disabled";
  emoji?: string;
  scripts: string[];
}

const LOCATION_ORDER: Record<string, number> = { workspace: 0, extension: 1, global: 2 };

const TYPE_CONFIG: Record<string, { className?: string; style?: React.CSSProperties; label: string }> = {
  workspace: { className: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200", label: "Custom" },
  global: {
    label: "Built-in",
    style: {
      backgroundColor: "color-mix(in srgb, var(--theme-accent) 10%, transparent)",
      color: "var(--theme-accent)",
      opacity: 0.7,
    },
  },
  extension: {
    label: "Extension",
    style: {
      backgroundColor: "color-mix(in srgb, var(--theme-accent) 15%, transparent)",
      color: "var(--theme-accent)",
    },
  },
};

function SkillsSkeleton() {
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Skill</TableHead>
            <TableHead>Workspace</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-28" /></TableCell>
              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
              <TableCell><Skeleton className="h-4 w-48" /></TableCell>
              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

type LocationTab = "all" | "workspace" | "extension" | "global";

export default function SkillsPage() {
  const { counts: globalCounts } = useCounts();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [modelLinks, setModelLinks] = useState<SkillModelLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string | null>("location");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [tab, setTab] = useState<LocationTab>("all");
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [skillContent, setSkillContent] = useState<string>("");
  const [contentLoading, setContentLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/skills").then(r => r.json()),
      fetch("/api/skill-models").then(r => r.json()).catch(() => []),
    ]).then(([skillsData, linksData]) => {
      if (Array.isArray(skillsData)) setSkills(skillsData);
      else if (skillsData.error) setError(skillsData.error);
      if (Array.isArray(linksData)) setModelLinks(linksData);
      setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); });
  }, []);

  // Fetch skill markdown content when selected
  useEffect(() => {
    if (!selectedSkill) {
      setSkillContent("");
      return;
    }
    
    setContentLoading(true);
    fetch(`/api/skills/${selectedSkill.name}/content`)
      .then(r => r.json())
      .then(data => {
        setSkillContent(data.content || "No documentation available.");
      })
      .catch(() => {
        setSkillContent("Failed to load skill documentation.");
      })
      .finally(() => setContentLoading(false));
  }, [selectedSkill]);

  const getModelsForSkill = (name: string) => {
    const links = modelLinks.filter(l => l.skill === name);
    const seen = new Set<string>();
    return links.filter(l => { if (seen.has(l.model)) return false; seen.add(l.model); return true; });
  };

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(getNextSortDirection(sortDir));
    else { setSortBy(col); setSortDir("asc"); }
  };

  const byTab = tab === "all" ? skills : skills.filter(s => s.location === tab);
  const q = filterQuery.trim().toLowerCase();
  const filtered = byTab.filter((skill) => {
    if (!q) return true;
    return [skill.name, skill.description, skill.location]
      .some((value) => value.toLowerCase().includes(q));
  });

  const sorted = sortBy === "location"
    ? [...filtered].sort((a, b) => {
        const diff = (LOCATION_ORDER[a.location] ?? 9) - (LOCATION_ORDER[b.location] ?? 9);
        return sortDir === "asc" ? diff || a.name.localeCompare(b.name) : -diff || b.name.localeCompare(a.name);
      })
    : sortData(filtered, sortBy, sortDir);

  const counts: Record<LocationTab, number> = {
    all: skills.length,
    workspace: skills.filter(s => s.location === "workspace").length,
    extension: skills.filter(s => s.location === "extension").length,
    global: skills.filter(s => s.location === "global").length,
  };

  const TAB_LABELS: { value: LocationTab; label: string }[] = [
    { value: "all",       label: `All (${counts.all})` },
    { value: "workspace", label: `Custom (${counts.workspace})` },
    { value: "extension", label: `Extension (${counts.extension})` },
    { value: "global",    label: `Built-in (${counts.global})` },
  ];

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-4xl font-bold">Skills & Integrations</h1>
              <PageInfo page="skills" />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {loading ? <Skeleton className="inline-block h-4 w-32" /> : `${globalCounts?.skills ?? "…"} skills`}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded">
            Error: {error}
          </div>
        )}

        <Tabs value={tab} onValueChange={v => setTab(v as LocationTab)}>
          <TabsList>
            {TAB_LABELS.map(t => (
              <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <TableFilter
          placeholder="Filter skills..."
          value={filterQuery}
          onChange={setFilterQuery}
        />

        {loading ? <SkillsSkeleton /> : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortableTableHead column="name" label="Skill" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </TableHead>
                  <TableHead>
                    <SortableTableHead column="workspace" label="Workspace" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Models</TableHead>
                  <TableHead>
                    <SortableTableHead column="location" label="Type" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No skills found</TableCell>
                  </TableRow>
                ) : sorted.map(skill => {
                  const typeConf = TYPE_CONFIG[skill.location];
                  return (
                    <TableRow
                      key={skill.name}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => setSelectedSkill(skill)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Puzzle className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span>{skill.name}</span>
                          {skill.scripts.length > 0 && (
                            <span className="text-xs text-muted-foreground font-normal flex items-center gap-0.5">
                              <FileCode className="h-3 w-3" />{skill.scripts.length}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {skill.workspace ? (
                          <span className={`text-xs font-medium px-2 py-1 rounded ${
                            skill.workspace === "main"
                              ? "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200"
                              : "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200"
                          }`}>{skill.workspace}</span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-muted-foreground max-w-xs">
                        <span className="line-clamp-2">{skill.description}</span>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const models = getModelsForSkill(skill.name);
                          if (!models.length) return <span className="text-xs text-muted-foreground">—</span>;
                          return (
                            <div className="flex flex-wrap gap-1">
                              {models.map(m => (
                                <span
                                  key={m.model}
                                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-mono"
                                  style={{
                                    backgroundColor: m.source === "local"
                                      ? "color-mix(in srgb, var(--theme-accent) 10%, transparent)"
                                      : "rgba(147, 51, 234, 0.1)",
                                    color: m.source === "local" ? "var(--theme-accent)" : "rgb(147, 51, 234)",
                                  }}
                                  title={`${m.via}: ${m.script}`}
                                >
                                  {m.source === "local" ? <Cpu className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                                  {m.model}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium px-2 py-1 rounded ${typeConf.className ?? ""}`} style={typeConf.style}>
                          {typeConf.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Skill detail — Dialog with Markdown */}
      <Dialog open={!!selectedSkill} onOpenChange={open => { if (!open) setSelectedSkill(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] p-0">
          {selectedSkill && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    <Puzzle className="h-5 w-5 text-muted-foreground shrink-0" />
                    {selectedSkill.name}
                  </DialogTitle>
                  <button
                    onClick={() => setSelectedSkill(null)}
                    className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${TYPE_CONFIG[selectedSkill.location].className ?? ""}`} style={TYPE_CONFIG[selectedSkill.location].style}>
                    {TYPE_CONFIG[selectedSkill.location].label}
                  </span>
                  {selectedSkill.workspace && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200">
                      {selectedSkill.workspace}
                    </span>
                  )}
                  {selectedSkill.status === "disabled" && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      Disabled
                    </span>
                  )}
                </div>
              </DialogHeader>

              <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                {contentLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{skillContent}</ReactMarkdown>
                  </div>
                )}
              </div>

              {/* Scripts section */}
              {selectedSkill.scripts.length > 0 && (
                <div className="px-6 py-4 border-t bg-muted/50">
                  <h4 className="text-sm font-medium mb-2">Scripts</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedSkill.scripts.map(script => (
                      <code key={script} className="text-xs px-2 py-1 bg-muted rounded">
                        {script}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
