import { PageInfo } from "@/components/PageInfo";
import Layout from "@/components/Layout";
import { TableFilter } from "@/components/TableFilter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, FileCode, Puzzle } from "lucide-react";
import { SortableTableHead } from "@/components/SortableTableHead";
import { sortData, getNextSortDirection, type SortDirection } from "@/lib/sorting";
import { useState, useEffect } from "react";
import { useCounts } from "@/lib/counts-context";

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

const TYPE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  workspace: { bg: "bg-purple-100 dark:bg-purple-900", text: "text-purple-700 dark:text-purple-200", label: "Custom" },
  global:    { bg: "bg-blue-100 dark:bg-blue-900",    text: "text-blue-700 dark:text-blue-200",    label: "Built-in" },
  extension: { bg: "bg-green-100 dark:bg-green-900",  text: "text-green-700 dark:text-green-200",  label: "Extension" },
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string | null>("location");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [tab, setTab] = useState<LocationTab>("all");
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  useEffect(() => {
    fetch("/api/skills")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setSkills(d); else setError(d.error); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

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

        {/* Location filter tabs */}
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
                  <TableHead>
                    <SortableTableHead column="location" label="Type" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </TableHead>

                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No skills found</TableCell>
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
                        <span className={`text-xs font-medium px-2 py-1 rounded ${typeConf.bg} ${typeConf.text}`}>
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

      {/* Skill detail — Sheet */}
      <Sheet open={!!selectedSkill} onOpenChange={open => { if (!open) setSelectedSkill(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selectedSkill && (() => {
            const typeConf = TYPE_CONFIG[selectedSkill.location];
            return (
              <>
                <SheetHeader className="pb-4">
                  <SheetTitle className="flex items-center gap-2 pr-8">
                    <Puzzle className="h-6 w-6 text-muted-foreground shrink-0" />
                    {selectedSkill.name}
                  </SheetTitle>
                </SheetHeader>

                <div className="px-6 pb-6 space-y-5">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${typeConf.bg} ${typeConf.text}`}>
                      {typeConf.label}
                    </span>
                    {selectedSkill.workspace && (
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        selectedSkill.workspace === "main"
                          ? "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200"
                          : "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200"
                      }`}>{selectedSkill.workspace}</span>
                    )}

                  </div>

                  {/* Description */}
                  {selectedSkill.description && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                      <p className="text-sm">{selectedSkill.description}</p>
                    </div>
                  )}

                  {/* Path */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Path</p>
                    <p className="text-xs font-mono text-muted-foreground break-all bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded">
                      {selectedSkill.path}
                    </p>
                  </div>

                  {/* Scripts */}
                  {selectedSkill.scripts.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Scripts ({selectedSkill.scripts.length})
                      </p>
                      <div className="space-y-1.5">
                        {selectedSkill.scripts.map(s => (
                          <div key={s} className="flex items-center gap-2 text-xs font-mono bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded border border-gray-200 dark:border-gray-700">
                            <FileCode className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No scripts */}
                  {selectedSkill.scripts.length === 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Scripts</p>
                      <p className="text-xs text-muted-foreground italic">No scripts found</p>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </Layout>
  );
}
