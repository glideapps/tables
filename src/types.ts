export type ColumnType = "string" | "number";

export type ColumnSchemaEntry = { type: ColumnType; name?: string };

export type ColumnSchema = Record<string, ColumnType | ColumnSchemaEntry>;

type Pretty<T> = { [K in keyof T]: T[K] } & {};

type ColumnTypeToType<T extends ColumnType> = T extends "string"
  ? string
  : T extends "number"
  ? number
  : never;

type ColumnTypeOrSchemaEntryToType<T> = T extends ColumnType
  ? ColumnTypeToType<T>
  : T extends ColumnSchemaEntry
  ? ColumnTypeToType<T["type"]>
  : never;

export type Row<T extends ColumnSchema> = Pretty<
  Partial<{
    [K in keyof T]: ColumnTypeOrSchemaEntryToType<T[K]>;
  }>
>;

export type RowID = string;

export type FullRow<T extends ColumnSchema> = Row<T> & {
  $rowID: RowID;
};

export interface TableProps<T> {
  token?: string;

  app: string;
  table: string;
  columns: T;
}
