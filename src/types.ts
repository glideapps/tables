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

export type GlideProps = {
  token: string;
  endpoint: string;
  endpointREST: string;
};

export type { RowOf } from "./Table";

export type ColumnType = ColumnStringType | "number" | "boolean";
export type ColumnSchemaEntry = { type: ColumnType; name?: string };

export type ColumnSchema = Record<string, ColumnType | ColumnSchemaEntry>;

export type APIColumnSchema = { id: string; name: string; type: { kind: string } };
export type APITableSchema = { columns: APIColumnSchema[] };

export type IDName = { id: string; name: string };

type Pretty<T> = { [K in keyof T]: T[K] } & {};

export type RowIdentifiable<T extends ColumnSchema> = RowID | FullRow<T>;

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

export type NullableRow<T extends ColumnSchema> = Pretty<
  Partial<{
    [K in keyof T]: null | ColumnTypeOrSchemaEntryToType<T[K]>;
  }>
>;

export type RowID = string;

export type FullRow<T extends ColumnSchema> = Pretty<
  {
    $rowID: RowID;
  } & Row<T>
>;

export type NullableFullRow<T extends ColumnSchema> = Pretty<
  {
    $rowID: RowID;
  } & NullableRow<T>
>;

export type Tokened = { token?: string };

export interface TableProps<T = {}> extends Tokened {
  name?: string;
  app: string;
  table: string;
  columns: T;
}

export interface AppProps extends Tokened {
  id: string;
  name?: string;
}

export type Operator = "<" | "<=" | "=" | "!=" | ">=" | ">";
export type IsNull = "IS NULL" | "IS NOT NULL";

export type Order = "ASC" | "DESC";

type ValuePredicate<TRow> = {
  column: keyof TRow;
  compare: Operator;
  other: keyof TRow | string | number;
};

type NullPredicate<TRow> = {
  column: keyof TRow;
  compare: IsNull;
};

export type Predicate<TRow> = ValuePredicate<TRow> | NullPredicate<TRow>;

export interface ToSQL {
  toSQL(): string;
}

export interface Query<TRow, TOmit extends string = ""> extends ToSQL {
  orderBy(
    column: keyof TRow,
    order?: Order
  ): Omit<Query<TRow, TOmit | "orderBy">, TOmit | "orderBy">;

  where(
    column: keyof TRow,
    compare: Operator,
    other: keyof TRow | string | number
  ): Omit<QueryAnd<TRow, TOmit | "where"> & QueryOr<TRow, TOmit | "where">, TOmit | "where">;

  where(
    column: keyof TRow,
    compare: IsNull
  ): Omit<QueryAnd<TRow, TOmit | "where"> & QueryOr<TRow, TOmit | "where">, TOmit | "where">;

  limit(n: number): Omit<Query<TRow, TOmit | "limit">, TOmit | "limit">;
}

export interface QueryAnd<TRow, TOmit extends string> extends Query<TRow, TOmit> {
  and(
    column: keyof TRow,
    compare: Operator,
    other: keyof TRow | string | number
  ): Omit<QueryAnd<TRow, TOmit>, TOmit>;
  and(column: keyof TRow, compare: IsNull): Omit<QueryAnd<TRow, TOmit>, TOmit>;
}

export interface QueryOr<TRow, TOmit extends string> extends Query<TRow, TOmit> {
  or(
    column: keyof TRow,
    compare: Operator,
    other: keyof TRow | string | number
  ): Omit<QueryOr<TRow, TOmit>, TOmit>;
  or(column: keyof TRow, compare: IsNull): Omit<QueryOr<TRow, TOmit>, TOmit>;
}

export interface AppManifest {
  theme_color: string;
  author: string;
  glidePWAAddToHead: string;
  display: string;
  description: string;
  icons: Icon[];
  start_url: string;
  background_color: string;
  name: string;
  short_name: string;
}

interface Icon {
  sizes: string;
  src: string;
  purpose: string;
  type: string;
}
