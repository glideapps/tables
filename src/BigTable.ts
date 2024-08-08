import { QueryBuilder } from "./QueryBuilder";
import { v4 as uuidv4 } from "uuid";
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
import { mapChunks } from "./Table";
import { Stash } from "./Stash";

/**
 * Class to interact with the Glide API v2 with functionalities reserved for Big Tables.
 */
export class BigTable<T extends ColumnSchema = {}> {
  private displayNameToName: Record<keyof FullRow<T>, string>;

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
  constructor(private props: Omit<TableProps<T>, "app">, private glide: Glide) {
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
    const { table } = this.props;

    const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
    const renamedRows = this.renameOutgoing(rows);

    const addedIds = await mapChunks(renamedRows, MAX_MUTATIONS, async chunk => {
      const response = await this.glide.post(`/tables/${table}/rows`, chunk);
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
   * Creates a new Stash object for the BigTable.
   *
   * @returns The newly created Stash object.
   */
  createStash(): Stash<T> {
    // const stashId: string = "20240215-job32";
    // const stashId: string = Math.random().toString(36).substring(2, 15);
    // TODO: use a better stash id (for now using uuid v4 because no other stashId seems to work)
    const stashId: string = uuidv4();
    return new Stash({ stashId, bigTable: this }, this.glide);
  }

  /**
   * Adds a Stash to the BigTable.
   *
   * @param stash The Stash to add.
   * @returns A promise that resolves to an array of row IDs if successful, or undefined.
   */
  async addStash(stash: Stash<T>): Promise<RowID[]> {
    const response = await this.glide.post(`/tables/${this.id}/rows`, {
      $stashID: stash.stashId,
    });
    await throwError(response);

    const {
      data: { rowIDs },
    } = await response.json();
    return rowIDs;
  }

  /**
   * Overwrites a row or rows in the BigTable.
   *
   * @param rowOrRows The row or rows to overwrite.
   * @returns A promise that resolves to the row ID or an array of row IDs if successful, or undefined.
   */
  async overwrite(rowOrRows: Row<T> | Row<T>[]): Promise<RowID | RowID[]> {
    const { table } = this.props;

    const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
    const renamedRows = this.renameOutgoing(rows);

    const addedIds = await mapChunks(renamedRows, MAX_MUTATIONS, async chunk => {
      // TODO see if the chunk should be in the "rows" key in the docs
      const response = await this.glide.put(`/tables/${table}/`, chunk);
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
   * Overwrites a Stash in the BigTable.
   *
   * @param stash The Stash to overwrite.
   * @returns A promise that resolves to an array of row IDs if successful, or undefined.
   */
  async overwriteStash(stash: Stash<T>): Promise<RowID[]> {
    const response = await this.glide.post(`/tables/${this.id}`, {
      $stashID: stash.stashId,
    });
    await throwError(response);

    const {
      data: { rowIDs },
    } = await response.json();
    return rowIDs;
  }
}
