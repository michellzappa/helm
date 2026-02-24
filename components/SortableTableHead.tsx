import { ChevronUp, ChevronDown } from "lucide-react";
import { SortDirection } from "@/lib/sorting";

interface SortableTableHeadProps {
  column: string;
  label: string;
  sortBy: string | null;
  sortDir: SortDirection;
  onSort: (column: string) => void;
}

export function SortableTableHead({
  column,
  label,
  sortBy,
  sortDir,
  onSort,
}: SortableTableHeadProps) {
  const isActive = sortBy === column;

  return (
    <button
      onClick={() => onSort(column)}
      className="w-full text-left flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
    >
      <span>{label}</span>
      {isActive && (
        <span className="flex-shrink-0">
          {sortDir === "asc" ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </span>
      )}
    </button>
  );
}
