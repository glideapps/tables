import { QueryBuilder } from "./QueryBuilder";
import { Client, makeClient } from "./rest";
import type {
  TableProps,
  Row,
  ColumnSchema,
  RowID,
  FullRow,
  AppProps,
  Query,
  ToSQL,
} from "./types";

import fetch from "cross-fetch";

type RowIdentifiable<T extends ColumnSchema> = RowID | FullRow<T>;

type IDName = { id: string; name: string };

function rowID(row: RowIdentifiable<any>): RowID {
  return typeof row === "string" ? row : row.$rowID;
}

export class NonQueryableTableError extends Error {}

/**
 * Type alias for a row of a given table.
 */
export type RowOf<T extends Table<any>> = T extends Table<infer R> ? FullRow<R> : never;

const defaultEndpoint = "https://api.glideapp.io/api/function";

class Table<T extends ColumnSchema> {
  private props: TableProps<T>;

  private client: Client;

  private displayNameToName: Record<keyof FullRow<T>, string>;

  /**
   * @returns The app id.
   */
  public get app(): string {
    return this.props.app;
  }

  /**
   * @returns The table id.
   */
  public get id(): string {
    return this.props.table;
  }

  /**
   * @deprecated Use `id` instead.
   * @returns The table id.
   */
  public get table(): string {
    return this.props.table;
  }

  /**
   * @returns The display name
   */
  public get name() {
    return this.props.name;
  }

  constructor(props: TableProps<T>) {
    const token = props.token ?? process.env.GLIDE_TOKEN!;
    this.props = { ...props, token };
    this.client = makeClient({ token });

    const { columns } = props;
    this.displayNameToName = Object.fromEntries(
      Object.entries(columns).map(([displayName, value]) =>
        typeof value !== "string" && typeof value.name === "string"
          ? [displayName, value.name /* internal name */]
          : [displayName, displayName]
      )
    ) as Record<keyof T, string>;
    this.displayNameToName["$rowID"] = "$rowID";
  }

  private renameOutgoing(rows: Row<T>[]): Row<T>[] {
    const rename = this.displayNameToName;
    return rows.map(
      row =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [rename[key] ?? key, value])
        ) as Row<T>
    );
  }

  private renameIncoming(rows: FullRow<T>[]): FullRow<T>[] {
    const { columns } = this.props;

    const rename = Object.fromEntries(
      Object.entries(columns).map(([displayName, value]) =>
        typeof value !== "string" && typeof value.name === "string"
          ? [value.name /* internal name */, displayName]
          : [displayName, displayName]
      )
    );

    return rows.map(
      row =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [rename[key] ?? key, value])
        ) as FullRow<T>
    );
  }

  /**
   * Adds rows to the table.
   *
   * @param rows An array of rows to add to the table.
   * @returns A promise that resolves to an array of row IDs for the added rows.
   */
  public async addRows(rows: Row<T>[]): Promise<RowID[]> {
    const { token, app, table } = this.props;

    const renamedRows = this.renameOutgoing(rows);

    const response = await fetch(this.endpoint("/mutateTables"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        appID: app,
        mutations: renamedRows.map(row => ({
          kind: "add-row-to-table",
          tableName: table,
          columnValues: row,
        })),
      }),
    });

    const added = await response.json();
    return added.map((row: any) => row.rowID);
  }

  /**
   * Adds rows to the table.
   *
   * @param rows An array of rows to add to the table.
   * @returns A promise that resolves to an array of row IDs for the added rows.
   */
  public async addRow(row: Row<T>): Promise<RowID> {
    return this.addRows([row]).then(([id]) => id);
  }

  endpoint(path: string = "/"): string {
    let base = this.props.endpoint ?? defaultEndpoint;
    if (!base.includes("://")) {
      base = `https://${base}`;
    }
    return `${base}${path}`;
  }

  /**
   * Updates multiple rows in the table.
   *
   * @param rows An array of objects, each containing an id and a row to update in the table.
   * @returns A promise that resolves when the rows have been updated.
   */
  async setRows(rows: { id: RowIdentifiable<T>; row: Row<T> }[]): Promise<void> {
    const { token, app, table } = this.props;

    await fetch(this.endpoint("/mutateTables"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        appID: app,
        mutations: rows.map(({ id, row }) => {
          return {
            kind: "set-columns-in-row",
            tableName: table,
            columnValues: this.renameOutgoing([row])[0],
            rowID: rowID(id),
          };
        }),
      }),
    });
  }

  /**
   * Sets values in a single row in the table.
   *
   * @param id The ID of the row to set.
   * @param row The row data to set.
   * @returns A promise that resolves when the row has been set.
   */
  public async setRow(id: RowIdentifiable<T>, row: Row<T>): Promise<void> {
    return await this.setRows([{ id, row }]);
  }

  /**
   * Deletes multiple rows from the table.
   *
   * @param rows An array of row identifiers to delete from the table.
   * @returns A promise that resolves when the rows have been deleted.
   */
  public async deleteRows(rows: RowIdentifiable<T>[]): Promise<void> {
    const { token, app, table } = this.props;

    await fetch(this.endpoint("/mutateTables"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        appID: app,
        mutations: rows.map(row => ({
          kind: "delete-row",
          tableName: table,
          rowID: rowID(row),
        })),
      }),
    });
  }

  /**
   * Deletes a single row from the table.
   *
   * @param row The identifier of the row to delete from the table.
   * @returns A promise that resolves when the row has been deleted.
   */
  public async deleteRow(row: RowIdentifiable<T>): Promise<void> {
    await this.deleteRows([row]);
  }

  /**
   * Retrieves the schema of the table.
   *
   * @returns A promise that resolves to the schema of the table.
   */
  public async getSchema(): Promise<{
    data: { columns: Array<{ id: string; name: string; type: { kind: string } }> };
  }> {
    const { app, table } = this.props;

    const response = await this.client.get(`/apps/${app}/tables/${table}/schema`);

    if (response.status !== 200) {
      throw new Error(`Failed to get schema: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Retrieves all rows from the table. Requires Business or Enterprise.
   *
   * @param query Big Tables only. A query to filter the rows by.
   * @returns A promise that resolves to an array of full rows from the table.
   */
  public async getRows(query?: (q: Query<FullRow<T>>) => ToSQL): Promise<FullRow<T>[]> {
    const { token, app, table } = this.props;
    let startAt: string | undefined;
    let rows: FullRow<T>[] = [];

    const sql = query?.(
      new QueryBuilder({
        table,
        displayNameToName: name => this.displayNameToName[name],
      })
    ).toSQL();

    do {
      const response = await fetch(this.endpoint("/queryTables"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          appID: app,
          queries: [{ tableName: table, sql, startAt }],
        }),
      });

      if (!response.ok) {
        const { message } = await response.json();
        if (message === "SQL queries only supported for queryable data sources") {
          throw new NonQueryableTableError(message);
        }
        throw new Error(`Error ${response.status}: ${message}`);
      }

      const [result] = await response.json();
      rows = rows.concat(this.renameIncoming(result.rows));
      startAt = result.next;
    } while (startAt !== undefined);

    return rows;
  }

  /**
   * Retrieves a row from the table. Requires Business or Enterprise.
   *
   * @returns A promise that resolves to the row if found, or undefined.
   */
  public async getRow(id: RowID): Promise<FullRow<T> | undefined> {
    let rows: FullRow<T>[] = [];
    try {
      rows = await this.getRows(q => q.where("$rowID", "=", id).limit(1));
    } catch {
      // Try again without a query (table is likely not queryable)
      rows = await this.getRows();
    }
    return rows.find(r => rowID(r) === id);
  }
}

class App {
  private props: AppProps;
  private client: Client;

  public get id() {
    return this.props.id;
  }

  public get name() {
    return this.props.name;
  }

  constructor(props: AppProps) {
    const token = props.token ?? process.env.GLIDE_TOKEN!;
    this.props = { ...props, token };
    this.client = makeClient({ token });
  }

  /**
   * Retrieves a table by its name.
   *
   * @param name - The name of the table to retrieve.
   * @returns A promise that resolves to the table if found, or undefined.
   */
  public async getTableNamed(name: string) {
    const tables = await this.getTables();
    return tables?.find(t => t.name === name);
  }

  /**
   * Retrieves all tables from the application.
   *
   * @returns A promise that resolves to an array of tables if successful, or undefined.
   */
  public async getTables() {
    const { id } = this.props;
    const result = await this.client.get(`/apps/${id}/tables`);

    if (result.status !== 200) return undefined;

    const { data: tables }: { data: IDName[] } = await result.json();
    return tables.map(t => this.table({ table: t.id, name: t.name, columns: {} }));
  }

  /**
   * Constructs a new Table instance for querying.
   *
   * @param props - The properties of the table, excluding the app.
   * @returns The newly created Table instance.
   */
  public table<T extends ColumnSchema>(props: Omit<TableProps<T>, "app">) {
    return new Table<T>({
      app: this.props.id,
      token: this.props.token,
      endpoint: this.props.endpoint,
      ...props,
    });
  }
}

/**
 * Creates a new App instance for querying an app
 *
 * @param props If a string is provided, it is used as the id of the App. If an AppProps object is provided, it is used as the properties for the App.
 * @returns The newly created App instance.
 */
export function app(props: AppProps | string): App {
  if (typeof props === "string") {
    props = { id: props };
  }
  return new App(props);
}

/**
 * Retrieves all applications.
 *
 * @param props An optional object containing a token.
 * @param props.token An optional token for authentication.
 * @returns A promise that resolves to an array of applications if successful, or undefined.
 */
export async function getApps(props: { token?: string } = {}): Promise<App[] | undefined> {
  const client = makeClient(props);
  const response = await client.get(`/apps`);
  if (response.status !== 200) return undefined;
  const { data: apps }: { data: IDName[] } = await response.json();
  return apps.map(idName => app({ ...props, ...idName }));
}

/**
 * Retrieves an app by its name.
 *
 * @param name The name of the application to retrieve.
 * @param props An optional object containing a token.
 * @param props.token An optional token for authentication.
 * @returns A promise that resolves to the application if found, or undefined.
 */
export async function getAppNamed(
  name: string,
  props: { token?: string } = {}
): Promise<App | undefined> {
  const apps = await getApps(props);
  return apps?.find(a => a.name === name);
}

/**
 * This function creates a new Table object with the provided properties.
 *
 * @param props The properties to create the table with.
 * @returns The newly created table.
 */
export function table<T extends ColumnSchema>(props: TableProps<T>) {
  return new Table<T>(props);
}
