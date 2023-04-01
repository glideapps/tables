import { AnyZodObject } from "zod";
import type { TableProps, Row, ColumnSchema, RowID, FullRow, TableOptions } from "./types";

import fetch from "cross-fetch";
import { columnToZodSchema } from "./column-to-zod";

type RowIdentifiable<T extends ColumnSchema> = RowID | FullRow<T>;

function rowID(row: RowIdentifiable<any>): RowID {
  return typeof row === "string" ? row : row.$rowID;
}

class Table<T extends ColumnSchema> {
  private props: TableProps<T>;
  private zodSchema: AnyZodObject | undefined;

  constructor(props: TableProps<T>, options: TableOptions = {}) {
    this.props = {
      token: process.env.GLIDE_TOKEN,
      ...props,
    };

    if (options.validate === true) {
      this.zodSchema = columnToZodSchema(props.columns);
    }
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

    const response = await fetch("https://api.glideapp.io/api/function/mutateTables", {
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

  public async setRows(rows: { id: RowIdentifiable<T>; row: Row<T> }[]): Promise<void> {
    const { token, app, table } = this.props;

    await fetch("https://api.glideapp.io/api/function/mutateTables", {
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

    await fetch("https://api.glideapp.io/api/function/mutateTables", {
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

  public async getRows(): Promise<FullRow<T>[]> {
    const { token, app, table } = this.props;

    const response = await fetch("https://api.glideapp.io/api/function/queryTables", {
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
    const [result] = await response.json();

    if (this.zodSchema !== undefined) {
      for (const row of result.rows) {
        const parsedRow = this.zodSchema.safeParse(row);

        if (!parsedRow.success) {
          throw new Error("Your schema and actual tables don't match!");
        }
      }
    }

    return this.renameIncoming(result.rows);
  }

  public async getRow(id: RowID): Promise<FullRow<T> | undefined> {
    const rows = await this.getRows();
    return rows.find(r => rowID(r) === id);
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
