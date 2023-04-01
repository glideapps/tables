import type { TableProps, Row, ColumnSchema, RowID, FullRow } from "./types";

import fetch from "cross-fetch";

class Table<T extends ColumnSchema> {
  private props: TableProps<T>;

  constructor(props: TableProps<T>) {
    this.props = {
      token: process.env.GLIDE_TOKEN,
      ...props,
    };
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
      (row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [rename[key], value])
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
      (row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [rename[key], value])
        ) as FullRow<T>
    );
  }

  public async addRows(rows: Row<T>[]): Promise<RowID[]> {
    const { token, app, table } = this.props;

    const renamedRows = this.renameOutgoing(rows);

    const response = await fetch(
      "https://api.glideapp.io/api/function/mutateTables",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          appID: app,
          mutations: renamedRows.map((row) => ({
            kind: "add-row-to-table",
            tableName: table,
            columnValues: row,
          })),
        }),
      }
    );

    const added = await response.json();
    return added.map((row: any) => row.rowID);
  }

  public async addRow(row: Row<T>): Promise<RowID> {
    return this.addRows([row]).then(([id]) => id);
  }

  public async deleteRows(rows: RowID[]): Promise<void> {
    const { token, app, table } = this.props;

    const response = await fetch(
      "https://api.glideapp.io/api/function/mutateTables",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          appID: app,
          mutations: rows.map((row) => ({
            kind: "delete-row",
            tableName: table,
            rowID: row,
          })),
        }),
      }
    );
  }

  public async deleteRow(row: RowID): Promise<void> {
    await this.deleteRows([row]);
  }

  public async getRows(): Promise<FullRow<T>[]> {
    const { token, app, table } = this.props;

    const response = await fetch(
      "https://api.glideapp.io/api/function/queryTables",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          appID: app,
          queries: [{ tableName: table }],
        }),
      }
    );
    const [result] = await response.json();
    return this.renameIncoming(result.rows);
  }
}

interface AppProps {
  id: string;
  token?: string;
}
class App {
  constructor(private props: AppProps) {}

  public table<T extends ColumnSchema>(props: Omit<TableProps<T>, "app">) {
    return new Table<T>({
      app: this.props.id,
      token: this.props.token,
      ...props,
    });
  }
}

export function app(props: AppProps): App {
  return new App(props);
}

export function table<T extends ColumnSchema>(props: TableProps<T>) {
  return new Table<T>(props);
}
