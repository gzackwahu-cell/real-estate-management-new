"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type DataTableClientItem = {
  id: string;
  search: string;
  cells: ReactNode[];
};

type DataTableClientProps = {
  columns: readonly { header: string; align?: "left" | "right" }[];
  items: readonly DataTableClientItem[];
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  defaultPageSize?: number;
  compact?: boolean;
};

export function DataTableClient({
  columns,
  items,
  searchPlaceholder = "Search records...",
  emptyTitle = "No records found",
  emptyDescription = "Try changing your search or add a new record.",
  defaultPageSize = 8,
  compact = false,
}: DataTableClientProps) {
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => item.search.includes(term));
  }, [items, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const start = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, filtered.length);

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-col gap-2 border-b px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative w-full sm:max-w-xs">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-8 pl-8 text-xs"
          />
        </label>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground sm:justify-end">
          <span className="tabular-nums">
            {filtered.length} {filtered.length === 1 ? "record" : "records"}
          </span>
          <label className="flex items-center gap-1.5">
            <span className="sr-only">Rows per page</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
            >
              {[5, 8, 12, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b bg-muted/40 text-[11px] tracking-wide text-muted-foreground uppercase">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.header}
                  scope="col"
                  className={`px-3 py-2 font-medium whitespace-nowrap ${
                    column.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <tr
                key={item.id}
                className="border-b last:border-0 hover:bg-muted/30"
              >
                {item.cells.map((cell, index) => (
                  <td
                    key={index}
                    className={`px-3 ${compact ? "py-2" : "py-2.5"} align-middle`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {emptyDescription}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 border-t px-3 py-2 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {start}-{end} of {filtered.length}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-7"
            disabled={currentPage <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="tabular-nums">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-7"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            aria-label="Next page"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
