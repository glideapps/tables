import { Table } from "./Table";
import { defaultEndpointREST } from "./constants";
import { Client, makeClient } from "./rest";
import type { TableProps, ColumnSchema, AppProps, IDName } from "./types";

export class App {
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

    const endpointREST = props.endpointREST ?? defaultEndpointREST;
    this.client = makeClient({ token, endpoint: endpointREST });
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
      endpointREST: this.props.endpointREST,
      ...props,
    });
  }
}
