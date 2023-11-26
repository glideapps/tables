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

async function mapChunks<TItem, TResult>(
  array: TItem[],
  chunkSize: number,
  work: (chunk: TItem[]) => Promise<TResult>
): Promise<TResult[]> {
  const results: TResult[] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    const result = await work(array.slice(i, i + chunkSize));
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
   * Add a row to the table.
   *
   * @param row A row to add.
   */
  public async add(row: Row<T>): Promise<RowID>;

  /**
   * Adds rows to the table.
   *
   * @param rows An array of rows to add to the table.
   */
  public async add(rows: Row<T>[]): Promise<RowID[]>;

  async add(rowOrRows: Row<T> | Row<T>[]): Promise<RowID | RowID[]> {
    const { app, table } = this.props;

    const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
    const renamedRows = this.renameOutgoing(rows);

    const addedIds = await mapChunks(renamedRows, MAX_MUTATIONS, async chunk => {
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
   * Update a row in the table.
   *
   * @param id The row id to update.
   * @param row A row to update.
   */
  public async update(id: RowID, row: NullableRow<T>): Promise<void>;

  /**
   * Update a row in the table.
   *
   * @param row A row to update.
   */
  public async update(row: NullableFullRow<T>): Promise<void>;

  /**
   * Update multiple rows in the table.
   *
   * @param rows An array of rows to update.
   */
  public async update(rows: NullableFullRow<T>[]): Promise<void>;

  /**
   * Update multiple rows in the table.
   *
   * @param rows An object of row ids to rows to update.
   */
  public async update(rows: Record<RowID, NullableRow<T>>): Promise<void>;

  async update(
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

    await mapChunks(Object.entries(updates), MAX_MUTATIONS, async chunk => {
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
   * Delete a single row from the table.
   *
   * @param row A row or row id to delete from the table.
   */
  public async delete(row: RowIdentifiable<T>): Promise<void>;

  /**
   * Delete multiple rows from the table.
   *
   * @param rows An array of rows or identifiers to delete.
   */
  public async delete(rows: RowIdentifiable<T>[]): Promise<void>;

  async delete(rowOrRows: RowIdentifiable<T> | RowIdentifiable<T>[]): Promise<void> {
    const { token, app, table } = this.props;

    const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];

    await mapChunks(rows, MAX_MUTATIONS, async chunk => {
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
    const rows = await this.get();
    await this.delete(rows);
  }

  // Used privately by `get`
  private async getRow(id: RowID): Promise<FullRow<T> | undefined> {
    let rows: FullRow<T>[] = [];
    try {
      rows = await this.get(q => q.where("$rowID", "=", id).limit(1));
    } catch {
      // Try again without a query (table is likely not queryable)
      rows = await this.get();
    }
    return rows.find(r => rowID(r) === id);
  }

  /**
   * Get all rows from the table. Requires Business+.
   */
  public async get(): Promise<FullRow<T>[]>;

  /**
   * Get a single row from the table. Requires Business+.
   *
   * @param rowID The row id to retrieve.
   */
  public async get(rowID: RowID): Promise<FullRow<T> | undefined>;

  /**
   * Query the table (Big Tables only). Requires Business+.
   *
   * @param query A query.
   */
  public async get(query: (q: Query<FullRow<T>>) => ToSQL): Promise<FullRow<T>[]>;

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
}
