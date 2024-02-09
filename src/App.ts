import { Glide } from "./Glide";
import { Table } from "./Table";
import type { TableProps, ColumnSchema, AppProps, IDName, AppManifest } from "./types";

import fetch from "cross-fetch";

export class App {
  public get id() {
    return this.props.id;
  }

  public get name() {
    return this.props.name;
  }

  constructor(private props: AppProps, private glide: Glide) {}

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
    const result = await this.glide.get(`/apps/${id}/tables`);

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
    return new Table<T>(
      {
        app: this.props.id,
        ...props,
      },
      this.glide
    );
  }

  /**
   * Retrieves the manifest for the app.
   */
  public async getManifest(): Promise<undefined | AppManifest> {
    const { id } = this.props;

    // We don't support staging apps yet
    const manifestUrl = `https://go.glideapps.com/play/${id}?manifest`;
    const result = await fetch(manifestUrl);

    if (result.status !== 200) return undefined;

    const manifest = await result.json();
    return manifest;
  }
}
