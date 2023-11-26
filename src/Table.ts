import { QueryBuilder } from "./QueryBuilder";
import { Client, makeClient } from "./rest";
import {
  type TableProps,
  type Row,
  type ColumnSchema,
  type RowID,
  type FullRow,
  type Query,
  type ToSQL,
  NonQueryableTableError,
  RowIdentifiable,
  NullableRow,
  NullableFullRow,
  APITableSchema,
} from "./types";
import fetch from "cross-fetch";
import { defaultEndpointREST, defaultEndpoint, MAX_MUTATIONS } from "./constants";

async function chunked<TItem, TResult>(
  array: TItem[],
  chunkSize: number,
  callback: (chunk: TItem[]) => Promise<TResult>
): Promise<TResult[]> {
  const results: TResult[] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    const result = await callback(array.slice(i, i + chunkSize));
    results.push(result);
  }
  return results;
}

function rowID(row: RowIdentifiable<any>): RowID {
  return typeof row === "string" ? row : row.$rowID;
}

export class Table<T extends ColumnSchema> {
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

    const endpointREST = props.endpointREST ?? defaultEndpointREST;
    this.client = makeClient({ token, endpoint: endpointREST });

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

  private endpoint(path: string = "/"): string {
    let base = this.props.endpoint ?? defaultEndpoint;
    if (!base.includes("://")) {
      base = `https://${base}`;
    }
    return `${base}${path}`;
  }

  private renameOutgoing(rows: NullableRow<T>[]): NullableRow<T>[] {
    const rename = this.displayNameToName;
    return rows.map(
      row =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            rename[key] ?? key,
            // null is sent as an empty string
            value === null ? "" : value,
          ])
        ) as NullableRow<T>
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
  public async add(row: Row<T>): Promise<RowID>;
  public async add(rows: Row<T>[]): Promise<RowID[]>;
  async add(rowOrRows: Row<T> | Row<T>[]): Promise<RowID | RowID[]> {
    const { app, table } = this.props;

    const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
    const renamedRows = this.renameOutgoing(rows);

    const addedIds = await chunked(renamedRows, MAX_MUTATIONS, async chunk => {
      const response = await this.client.post(`/apps/${app}/tables/${table}/rows`, chunk);
      const {
        data: { rowIDs },
      } = await response.json();
      return rowIDs;
    });

    const rowIDs = addedIds.flat();
    return Array.isArray(rowOrRows) ? rowIDs : rowIDs[0];
  }

  /**
   * Adds rows to the table.
   *
   * @deprecated Use `add` instead.
   *
   * @param rows An array of rows to add to the table.
   * @returns A promise that resolves to an array of row IDs for the added rows.
   */
  public async addRows(rows: Row<T>[]): Promise<RowID[]> {
    return this.add(rows);
  }

  /**
   * Adds rows to the table.
   *
   * @deprecated Use `add` instead.
   *
   * @param rows An array of rows to add to the table.
   * @returns A promise that resolves to an array of row IDs for the added rows.
   */
  public async addRow(row: Row<T>): Promise<RowID> {
    return this.add(row);
  }

  public async patch(id: RowID, row: NullableRow<T>): Promise<void>;
  public async patch(row: NullableFullRow<T>): Promise<void>;
  public async patch(rows: NullableFullRow<T>[]): Promise<void>;
  public async patch(rows: Record<RowID, NullableRow<T>>): Promise<void>;
  async patch(
    rows: RowID | NullableFullRow<T> | NullableFullRow<T>[] | Record<RowID, NullableRow<T>>,
    row?: NullableRow<T>
  ): Promise<void> {
    const updates: Record<RowID, NullableRow<T>> = {};
    if (typeof rows === "string") {
      updates[rows] = row as Row<T>;
    } else if ("$rowID" in rows) {
      updates[rows.$rowID as RowID] = rows as Row<T>;
    } else if (Array.isArray(rows)) {
      for (const row of rows) {
        updates[row.$rowID] = row as Row<T>;
      }
    } else {
      Object.assign(updates, rows);
    }

    const { token, app, table } = this.props;

    await chunked(Object.entries(updates), MAX_MUTATIONS, async chunk => {
      await fetch(this.endpoint("/mutateTables"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          appID: app,
          mutations: chunk.map(([id, row]) => {
            return {
              kind: "set-columns-in-row",
              tableName: table,
              columnValues: this.renameOutgoing([row])[0],
              rowID: rowID(id),
            };
          }),
        }),
      });
    });
  }

  /**
   * Sets values in a single row in the table.
   *
   * @deprecated Use `patch` instead.
   *
   * @param id The ID of the row to set.
   * @param row The row data to set.
   * @returns A promise that resolves when the row has been set.
   */
  public async setRow(id: RowIdentifiable<T>, row: Row<T>): Promise<void> {
    return this.patch(rowID(id), row);
  }

  /**
   * Deletes multiple rows from the table.
   *
   * @param rows An array of row identifiers to delete from the table.
   * @returns A promise that resolves when the rows have been deleted.
   */
  public async delete(row: RowIdentifiable<T>): Promise<void>;
  public async delete(rows: RowIdentifiable<T>[]): Promise<void>;
  async delete(rowOrRows: RowIdentifiable<T> | RowIdentifiable<T>[]): Promise<void> {
    const { token, app, table } = this.props;

    const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];

    await chunked(rows, MAX_MUTATIONS, async chunk => {
      await fetch(this.endpoint("/mutateTables"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          appID: app,
          mutations: chunk.map(row => ({
            kind: "delete-row",
            tableName: table,
            rowID: rowID(row),
          })),
        }),
      });
    });
  }

  /**
   * Deletes all rows from the table.
   */
  public async clear(): Promise<void> {
    const rows = await this.getRows();
    await this.delete(rows);
  }

  /**
   * Deletes multiple rows from the table.
   *
   * @deprecated Use `delete` instead.
   *
   * @param rows An array of row identifiers to delete from the table.
   * @returns A promise that resolves when the rows have been deleted.
   */
  public async deleteRows(rows: RowIdentifiable<T>[]): Promise<void> {
    return this.delete(rows);
  }

  /**
   * Deletes a single row from the table.
   *
   * @deprecated Use `delete` instead.
   *
   * @param row The identifier of the row to delete from the table.
   * @returns A promise that resolves when the row has been deleted.
   */
  public async deleteRow(row: RowIdentifiable<T>): Promise<void> {
    return this.delete(row);
  }

  /**
   * Retrieves the schema of the table.
   *
   * @returns A promise that resolves to the schema of the table.
   */
  public async getSchema(): Promise<{ data: APITableSchema }> {
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
  public async get(query?: (q: Query<FullRow<T>>) => ToSQL): Promise<FullRow<T>[]>;
  public async get(rowID: RowID): Promise<FullRow<T> | undefined>;
  async get(
    rowIDOrQuery?: RowID | ((q: Query<FullRow<T>>) => ToSQL)
  ): Promise<FullRow<T> | undefined | FullRow<T>[]> {
    if (typeof rowIDOrQuery === "string") {
      return await this.getRow(rowIDOrQuery);
    }

    const { token, app, table } = this.props;
    let startAt: string | undefined;
    let rows: FullRow<T>[] = [];

    const sql = rowIDOrQuery?.(
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
   * Retrieves all rows from the table. Requires Business or Enterprise.
   *
   * @deprecated Use `get` instead.
   *
   * @param query Big Tables only. A query to filter the rows by.
   * @returns A promise that resolves to an array of full rows from the table.
   */
  public async getRows(query?: (q: Query<FullRow<T>>) => ToSQL): Promise<FullRow<T>[]> {
    return this.get(query);
  }

  /**
   * Retrieves a row from the table. Requires Business or Enterprise.
   *
   * @deprecated Use `get` instead.
   *
   * @returns A promise that resolves to the row if found, or undefined.
   */
  public async getRow(id: RowID): Promise<FullRow<T> | undefined> {
    let rows: FullRow<T>[] = [];
    try {
      rows = await this.get(q => q.where("$rowID", "=", id).limit(1));
    } catch {
      // Try again without a query (table is likely not queryable)
      rows = await this.get();
    }
    return rows.find(r => rowID(r) === id);
  }
}
