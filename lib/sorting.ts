export type SortDirection = "asc" | "desc" | null;

export interface SortState {
  column: string | null;
  direction: SortDirection;
}

export function sortData<T>(
  data: T[],
  sortBy: string | null,
  direction: SortDirection
): T[] {
  if (!sortBy || !direction) return data;

  const sorted = [...data].sort((a, b) => {
    const aVal = (a as any)[sortBy];
    const bVal = (b as any)[sortBy];

    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    if (typeof aVal === "string") {
      return direction === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    if (typeof aVal === "number") {
      return direction === "asc" ? aVal - bVal : bVal - aVal;
    }

    return 0;
  });

  return sorted;
}

export function getNextSortDirection(current: SortDirection): SortDirection {
  if (current === "asc") return "desc";
  if (current === "desc") return null;
  return "asc";
}
