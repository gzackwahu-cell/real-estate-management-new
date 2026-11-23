import type { ReactNode } from "react";
import {
  DataTableClient,
  type DataTableClientItem,
} from "./data-table-client";

export type DataTableColumn<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  searchValue?: (row: T) => string | number | null | undefined;
  align?: "left" | "right";
  className?: string;
};

type DataTableProps<T> = {
  rows: readonly T[];
  columns: readonly DataTableColumn<T>[];
  getRowId: (row: T) => string;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  defaultPageSize?: number;
  compact?: boolean;
};

/**
 * Server-side table builder. Cells are rendered on the server and passed to the
 * client wrapper as serializable React nodes, so filtering and pagination stay
 * interactive without moving data-fetching logic into the browser.
 */
export function DataTable<T>({
  rows,
  columns,
  getRowId,
  searchPlaceholder,
  emptyTitle,
  emptyDescription,
  defaultPageSize = 8,
  compact = false,
}: DataTableProps<T>) {
  const items: DataTableClientItem[] = rows.map((row) => ({
    id: getRowId(row),
    search: columns
      .map((column) => {
        const value = column.searchValue?.(row);
        return value === null || value === undefined ? "" : String(value);
      })
      .join(" ")
      .toLowerCase(),
    cells: columns.map((column) => (
      <td key={column.header} className={column.className}>
        {column.cell(row)}
      </td>
    )),
  }));

  return (
    <DataTableClient
      columns={columns.map(({ header, align }) => ({ header, align }))}
      items={items}
      searchPlaceholder={searchPlaceholder}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      defaultPageSize={defaultPageSize}
      compact={compact}
    />
  );
}
