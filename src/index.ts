import { Client, makeClient } from "./rest";
import type { TableProps, Row, ColumnSchema, RowID, FullRow, AppProps } from "./types";

import fetch from "cross-fetch";

type RowIdentifiable<T extends ColumnSchema> = RowID | FullRow<T>;

type IDName = { id: string; name: string };

function rowID(row: RowIdentifiable<any>): RowID {
  return typeof row === "string" ? row : row.$rowID;
}

/**
 * For referring to the type of a row in a table.
 */
export type RowOf<T extends Table<any>> = T extends Table<infer R> ? FullRow<R> : never;

const defaultEndpoint = "https://api.glideapp.io/api/function";

class Table<T extends ColumnSchema> {
  private props: TableProps<T>;

  private client: Client;

  public get app(): string {
    return this.props.app;
  }

  public get id(): string {
    return this.props.table;
  }

  public get table(): string {
    return this.props.table;
  }

  public get name() {
    return this.props.name;
  }

  constructor(props: TableProps<T>) {
    const token = props.token ?? process.env.GLIDE_TOKEN!;
    this.props = { ...props, token };
    this.client = makeClient({ token });
  }

  private renameOutgoing(rows: Row<T>[]): Row<T>[] {
    const { columns } = this.props;

    const rename = Object.fromEntries(
      Object.entries(columns).map(([displayName, value]) =>
        typeof value !== "string" && typeof value.name === "string"
          ? [displayName, value.name /* internal name */]
          : [displayName, displayName]
      )
    );

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

  public async setRows(rows: { id: RowIdentifiable<T>; row: Row<T> }[]): Promise<void> {
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

  public async setRow(id: RowIdentifiable<T>, row: Row<T>): Promise<void> {
    return await this.setRows([{ id, row }]);
  }

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

  public async deleteRow(row: RowIdentifiable<T>): Promise<void> {
    await this.deleteRows([row]);
  }

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

  public async getRows(): Promise<FullRow<T>[]> {
    const { token, app, table } = this.props;

    const response = await fetch(this.endpoint("/queryTables"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        appID: app,
        queries: [{ tableName: table }],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to get rows: ${response.status} ${response.statusText} ${JSON.stringify({
          app,
          table,
        })}`
      );
    }

    const [result] = await response.json();
    return this.renameIncoming(result.rows);
  }

  public async getRow(id: RowID): Promise<FullRow<T> | undefined> {
    const rows = await this.getRows();
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

  public async getTableNamed(name: string) {
    const tables = await this.getTables();
    return tables?.find(t => t.name === name);
  }

  public async getTables() {
    const { id } = this.props;
    const result = await this.client.get(`/apps/${id}/tables`);

    if (result.status !== 200) return undefined;

    const { data: tables }: { data: IDName[] } = await result.json();
    return tables.map(t => this.table({ table: t.id, name: t.name, columns: {} }));
  }

  public table<T extends ColumnSchema>(props: Omit<TableProps<T>, "app">) {
    return new Table<T>({
      app: this.props.id,
      token: this.props.token,
      endpoint: this.props.endpoint,
      ...props,
    });
  }
}

export function app(props: AppProps | string): App {
  if (typeof props === "string") {
    props = { id: props };
  }
  return new App(props);
}

export async function getApps(props: { token?: string } = {}): Promise<App[] | undefined> {
  const client = makeClient(props);
  const response = await client.get(`/apps`);
  if (response.status !== 200) return undefined;
  const { data: apps }: { data: IDName[] } = await response.json();
  return apps.map(idName => app({ ...props, ...idName }));
}

export async function getAppNamed(
  name: string,
  props: { token?: string } = {}
): Promise<App | undefined> {
  const apps = await getApps(props);
  return apps?.find(a => a.name === name);
}

export function table<T extends ColumnSchema>(props: TableProps<T>) {
  return new Table<T>(props);
}
