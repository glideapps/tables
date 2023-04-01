export type ColumnType = "string" | "number";

export type ColumnSchema = Record<string, ColumnType>;

type Pretty<T> = { [K in keyof T]: T[K] } & {};

type ColumnTypeToType<T extends ColumnType> = T extends "string"
  ? string
  : T extends "number"
  ? number
  : never;

export type Row<T> = Pretty<
  {
    $rowID: string;
  } & Partial<{
    [K in keyof T]: T[K] extends ColumnType ? ColumnTypeToType<T[K]> : never;
  }>
>;

export type RowID = string;

export interface TableProps<T> {
  token?: string;

  app: string;
  table: string;
  columns: T;
}
