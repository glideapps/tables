import { App } from "./App";
import { Table } from "./Table";
import { defaultEndpoint, defaultEndpointREST } from "./constants";
import type { TableProps, ColumnSchema, AppProps, IDName, GlideProps, Tokened } from "./types";
import fetch from "cross-fetch";

export class Glide {
  private props: GlideProps;

  constructor(props: Partial<GlideProps> = {}) {
    this.props = {
      token: props.token ?? process.env.GLIDE_TOKEN!,
      endpoint: props.endpoint ?? defaultEndpoint,
      endpointREST: props.endpointREST ?? defaultEndpointREST,
      clientID: props.clientID,
    };
  }

  private endpoint(path: string = "/"): string {
    // Calls to mutateTables and queryTables should use the function endpoint.
    // TODO remove `endpoint` once we can use the REST endpoint for all calls.
    let base = ["/mutateTables", "/queryTables"].includes(path)
      ? this.props.endpoint
      : this.props.endpointREST;

    if (!base.includes("://")) {
      base = `https://${base}`;
    }

    return `${base}${path}`;
  }

  private api(route: string, r: RequestInit = {}) {
    const { token, clientID } = this.props;
    const maybeClientIDObject:
      | {
          "X-Glide-Client-ID": string;
        }
      | {} = clientID !== undefined ? { "X-Glide-Client-ID": clientID } : {};
    return fetch(this.endpoint(route), {
      method: "GET",
      ...r,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...maybeClientIDObject,
        ...r.headers,
      },
    });
  }

  public get(r: string) {
    return this.api(r, { method: "GET" });
  }

  public post(r: string, body: any) {
    return this.api(r, { method: "POST", body: JSON.stringify(body) });
  }

  public delete(r: string, body: any) {
    return this.api(r, { method: "DELETE", body: JSON.stringify(body) });
  }

  public with(props: Partial<GlideProps> = {}) {
    return new Glide({ ...this.props, ...props });
  }

  /**
   * Creates a new App instance for querying an app
   *
   * @param props If a string is provided, it is used as the id of the App. If an AppProps object is provided, it is used as the properties for the App.
   * @returns The newly created App instance.
   */
  public app(props: AppProps | string): App {
    if (typeof props === "string") {
      props = { id: props };
    }
    return new App(props, this.with(props));
  }

  /**
   * This function creates a new Table object with the provided properties.
   *
   * @param props The properties to create the table with.
   * @returns The newly created table.
   */
  public table<T extends ColumnSchema>(props: TableProps<T>) {
    return new Table<T>(props, this.with(props));
  }

  /**
   * Retrieves all applications.
   *
   * @param props An optional object containing a token.
   * @param props.token An optional token for authentication.
   * @returns A promise that resolves to an array of applications if successful, or undefined.
   */
  public async getApps(props: Tokened = {}): Promise<App[] | undefined> {
    const response = await this.with(props).get(`/apps`);
    if (response.status !== 200) return undefined;
    const { data: apps }: { data: IDName[] } = await response.json();
    return apps.map(idName => this.app({ ...idName }));
  }

  /**
   * Retrieves an app by its name.
   *
   * @param name The name of the application to retrieve.
   * @param props An optional object containing a token.
   * @param props.token An optional token for authentication.
   * @returns A promise that resolves to the application if found, or undefined.
   */
  public async getAppNamed(name: string, props: Tokened = {}): Promise<App | undefined> {
    const apps = await this.getApps(props);
    return apps?.find(a => a.name === name);
  }
}
