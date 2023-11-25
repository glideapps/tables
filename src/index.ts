import { App } from "./App";
import { Table } from "./Table";
import { makeClient } from "./rest";
import type { TableProps, ColumnSchema, FullRow, AppProps, IDName } from "./types";

/**
 * Type alias for a row of a given table.
 */
export type RowOf<T extends Table<any>> = T extends Table<infer R> ? FullRow<R> : never;

/**
 * Creates a new App instance for querying an app
 *
 * @param props If a string is provided, it is used as the id of the App. If an AppProps object is provided, it is used as the properties for the App.
 * @returns The newly created App instance.
 */
export function app(props: AppProps | string): App {
  if (typeof props === "string") {
    props = { id: props };
  }
  return new App(props);
}

/**
 * Retrieves all applications.
 *
 * @param props An optional object containing a token.
 * @param props.token An optional token for authentication.
 * @returns A promise that resolves to an array of applications if successful, or undefined.
 */
export async function getApps(
  props: { token?: string; endpoint?: string } = {}
): Promise<App[] | undefined> {
  const client = makeClient(props);
  const response = await client.get(`/apps`);
  if (response.status !== 200) return undefined;
  const { data: apps }: { data: IDName[] } = await response.json();
  return apps.map(idName => app({ ...props, ...idName }));
}

/**
 * Retrieves an app by its name.
 *
 * @param name The name of the application to retrieve.
 * @param props An optional object containing a token.
 * @param props.token An optional token for authentication.
 * @returns A promise that resolves to the application if found, or undefined.
 */
export async function getAppNamed(
  name: string,
  props: { token?: string; endpoint?: string } = {}
): Promise<App | undefined> {
  const apps = await getApps(props);
  return apps?.find(a => a.name === name);
}

/**
 * This function creates a new Table object with the provided properties.
 *
 * @param props The properties to create the table with.
 * @returns The newly created table.
 */
export function table<T extends ColumnSchema>(props: TableProps<T>) {
  return new Table<T>(props);
}
