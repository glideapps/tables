require("dotenv").config();

import _ from "lodash";
import { Glide } from "../Glide";

export const glideStaging = new Glide({
  endpoint: "https://staging.heyglide.com/api/container",
  endpointREST: "https://functions.staging.internal.glideapps.com/api",
  token: process.env.GLIDE_TOKEN_STAGING!,
});

export const app = glideStaging.app({
  id: "mT91fPcZCWigkZXgSZGJ",
});

export const table = app.table({
  table: "native-table-MX8xNW5WWoJhW4fwEeN7",
  columns: {
    name: { type: "string", name: "Name" },
    stock: { type: "number", name: "Description" },
    renamed: { type: "string", name: "yPXU2" },
  },
});

export const bigTable = app.table({
  table: "native-table-9500db9c-fa75-4968-82e3-9d53437893e8",
  columns: {
    name: { type: "string", name: "Name" },
    age: { type: "number", name: "wLP5Z" },
    otherName: { type: "string", name: "vnmf7" },
  },
});

export const bigBigTable = app.table({
  table: "native-table-9d8d43c5-b09b-4723-9c7f-0186991413d6",
  columns: {
    id: { type: "number", name: "Name" },
    value: { type: "number", name: "CBoVo" },
  },
});

test("nothing", async () => {
  // pass
});

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
