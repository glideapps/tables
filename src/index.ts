import { Glide } from "./Glide";

const defaultClient = new Glide();

export const app = defaultClient.app.bind(defaultClient);
export const table = defaultClient.table.bind(defaultClient);
export const getApps = defaultClient.getApps.bind(defaultClient);
export const getAppNamed = defaultClient.getAppNamed.bind(defaultClient);
export const withConfig = defaultClient.with.bind(defaultClient);

export { RowOf, AppManifest, ColumnType, ColumnSchema } from "./types";
export { type Table } from "./Table";
export { type Glide } from "./Glide";
export { type App } from "./App";
