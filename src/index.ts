import { Glide } from "./Glide";

const defaultClient = new Glide();

export const app = defaultClient.app;
export const table = defaultClient.table;
export const getApps = defaultClient.getApps.bind(defaultClient);
export const getAppNamed = defaultClient.getAppNamed.bind(defaultClient);
