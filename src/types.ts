export type ColumnStringType =
  | "string"
  | "uri"
  | "image-uri"
  | "audio-uri"
  | "date"
  | "time"
  | "date-time"
  | "markdown"
  | "phone-number"
  | "email-address"
  | "emoji"
  | "duration";

export type ColumnType = ColumnStringType | "number" | "boolean";
export type ColumnSchemaEntry = { type: ColumnType; name?: string };

export type ColumnSchema = Record<string, ColumnType | ColumnSchemaEntry>;

type Pretty<T> = { [K in keyof T]: T[K] } & {};

type ColumnTypeToType<T extends ColumnType> = T extends ColumnStringType
  ? string
  : T extends "number"
  ? number
  : T extends "boolean"
  ? boolean
  : unknown;

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

export type FullRow<T extends ColumnSchema> = Pretty<
  {
    $rowID: RowID;
  } & Row<T>
>;

export interface TableProps<T = {}> {
  token?: string;
  endpoint?: string;
  name?: string;

  app: string;
  table: string;
  columns: T;
}

export interface AppProps {
  id: string;
  token?: string;
  endpoint?: string;
  name?: string;
}
