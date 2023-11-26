import { QueryBuilder } from "./QueryBuilder";
import type {
  TableProps,
  Row,
  ColumnSchema,
  RowID,
  FullRow,
  Query,
  ToSQL,
  RowIdentifiable,
  NullableRow,
  NullableFullRow,
  APITableSchema,
} from "./types";
import { MAX_MUTATIONS } from "./constants";
import { throwError } from "./common";
import { Glide } from "./Glide";

/**
 * Type alias for a row of a given table.
 */
export type RowOf<T extends Table<any>> = T extends Table<infer R> ? FullRow<R> : never;

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

  constructor(private props: TableProps<T>, private glide: Glide) {
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
      const response = await this.glide.post(`/apps/${app}/tables/${table}/rows`, chunk);
      await throwError(response);

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

    const { app, table } = this.props;

    await mapChunks(Object.entries(updates), MAX_MUTATIONS, async chunk => {
      const response = await this.glide.post("/mutateTables", {
        appID: app,
        mutations: chunk.map(([id, row]) => ({
          kind: "set-columns-in-row",
          tableName: table,
          columnValues: this.renameOutgoing([row])[0],
          rowID: rowID(id),
        })),
      });
      await throwError(response);
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
    const { app, table } = this.props;

    const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];

    await mapChunks(rows, MAX_MUTATIONS, async chunk => {
      const response = await this.glide.post("/mutateTables", {
        appID: app,
        mutations: chunk.map(row => ({
          kind: "delete-row",
          tableName: table,
          rowID: rowID(row),
        })),
      });
      await throwError(response);
    });
  }

  /**
   * Deletes all rows from the table.
   */
  public async clear(): Promise<void> {
    const rows = await this.get();
    await this.delete(rows);
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

    const { app, table } = this.props;
    let startAt: string | undefined;
    let rows: FullRow<T>[] = [];

    const sql = rowIDOrQuery?.(
      new QueryBuilder({
        table,
        displayNameToName: name => this.displayNameToName[name],
      })
    ).toSQL();

    do {
      const response = await this.glide.post("/queryTables", {
        appID: app,
        queries: [{ tableName: table, sql, startAt }],
      });

      await throwError(response);

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

    const response = await this.glide.get(`/apps/${app}/tables/${table}/schema`);
    await throwError(response);

    return await response.json();
  }

  // DEPRECATED

  /**
   * @deprecated Use `id` instead.
   */
  public get table(): string {
    return this.props.table;
  }

  /**
   * Adds rows to the table.
   *
   * @deprecated Use `add` instead.
   *
   * @param rows An array of rows to add to the table.
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
   */
  public async addRow(row: Row<T>): Promise<RowID> {
    return this.add(row);
  }

  /**
   * Sets values in a single row in the table.
   *
   * @deprecated Use `update` instead.
   *
   * @param id The ID of the row to set.
   * @param row The row data to set.
   */
  public async setRow(id: RowIdentifiable<T>, row: Row<T>): Promise<void> {
    return this.update(rowID(id), row);
  }

  /**
   * Deletes multiple rows from the table.
   *
   * @deprecated Use `delete` instead.
   *
   * @param rows An array of row identifiers to delete from the table.
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
   */
  public async deleteRow(row: RowIdentifiable<T>): Promise<void> {
    return this.delete(row);
  }

  /**
   * Retrieves all rows from the table. Requires Business or Enterprise.
   *
   * @deprecated Use `get` instead.
   */
  public async getRows(): Promise<FullRow<T>[]> {
    return this.get();
  }

  /**
   * Retrieves a row from the table. Requires Business or Enterprise.
   *
   * @deprecated Use `get` instead.
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
