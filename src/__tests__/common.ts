require("dotenv").config();

import * as glide from "..";

import _ from "lodash";

export const staging = "https://functions.staging.internal.glideapps.com/api";

export const app = glide.app({
  id: "mT91fPcZCWigkZXgSZGJ",
  endpoint: "https://staging.heyglide.com/api/container",
  endpointREST: staging,
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

test("nothing", async () => {
  // pass
});
