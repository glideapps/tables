require("dotenv").config();

import * as glide from ".";
import type { RowOf } from ".";

import _ from "lodash";

const endpoint = "https://functions.staging.internal.glideapps.com/api";

const app = glide.app({
  id: "mT91fPcZCWigkZXgSZGJ",
  endpoint: "https://staging.heyglide.com/api/container",
  endpointREST: endpoint,
});

const table = app.table({
  table: "native-table-MX8xNW5WWoJhW4fwEeN7",
  columns: {
    name: { type: "string", name: "Name" },
    stock: { type: "number", name: "Description" },
    renamed: { type: "string", name: "yPXU2" },
  },
});

const bigTable = app.table({
  table: "native-table-9500db9c-fa75-4968-82e3-9d53437893e8",
  columns: {
    name: { type: "string", name: "Name" },
    age: { type: "number", name: "wLP5Z" },
    otherName: { type: "string", name: "vnmf7" },
  },
});

describe("app", () => {
  it("can get apps", async () => {
    const apps = await glide.getApps({ endpoint });
    expect(apps).toBeDefined();
    expect(apps?.length).toBeGreaterThan(0);
  });

  it("can get an app by name", async () => {
    const app = await glide.getAppNamed("API Testing", { endpoint });
    expect(app).toBeDefined();
  });

  it("can get tables", async () => {
    const tables = await app.getTables();
    expect(tables).toBeDefined();
    expect(tables?.length).toBeGreaterThan(0);
  });

  it("can get a table by name", async () => {
    const table = await app.getTableNamed("Things");
    expect(table).toBeDefined();
  });
});

describe("table", () => {
  jest.setTimeout(60_000);

  it("can get rows", async () => {
    const rows = await table.getRows();
    expect(rows).toBeDefined();
  });

  it("can get the row type", async () => {
    // This test doesn't actually do anything, but it's here to show that the
    // type can be constructed. Put your cursor over it to check.
    type InventoryItem = RowOf<typeof table>;
  });

  it("can add a row", async () => {
    const rowID = await table.addRow({
      name: "Test Item",
      renamed: "Test Description",
      stock: 100,
    });
    expect(rowID).toBeDefined();
  });

  it("can add multiple rows", async () => {
    const rowIDs = await table.addRows([{}, {}]);
    expect(rowIDs.length).toBe(2);
  });

  it("can add then delete a row", async () => {
    const rowID = await table.addRow({});
    expect(rowID).toBeDefined();
    await table.deleteRow(rowID);
  });

  it("can add then change a row", async () => {
    const rowID = await table.addRow({});

    expect(rowID).toBeDefined();

    await table.setRow(rowID, { name: "Renamed" });

    // wait to allow the row to be updated
    await new Promise(resolve => setTimeout(resolve, 5_000));

    const renamed = await table.getRow(rowID);
    expect(renamed?.name).toBe("Renamed");
  });

  it("can get schema", async () => {
    const {
      data: { columns },
    } = await table.getSchema();
    expect(columns).toBeTruthy();
  });
});

describe("query", () => {
  it("can limit", async () => {
    const rows = await bigTable.getRows(q => q.limit(1));
    expect(rows).toBeDefined();
    expect(rows.length).toBe(1);
  });

  it("can orderBy", async () => {
    const rows = await bigTable.getRows(q => q.orderBy("name"));
    expect(rows).toBeDefined();

    const names = rows.map(r => r.name);
    expect(names).toEqual(_.sortBy(names));
  });

  it("can orderBy DESC", async () => {
    const rows = await bigTable.getRows(q => q.orderBy("name", "DESC"));
    expect(rows).toBeDefined();

    const names = rows.map(r => r.name);
    expect(names).toEqual(_.sortBy(names).reverse());
  });

  it("can where", async () => {
    const rows = await bigTable.getRows(q => q.where("name", "=", "David"));
    expect(rows).toBeDefined();
    expect(rows.length).toBeGreaterThan(0);
  });

  it("can compare columns", async () => {
    const rows = await bigTable.getRows(q => q.where("name", "=", "otherName"));
    expect(rows).toBeDefined();
  });

  it("can where and", async () => {
    const rows = await bigTable.getRows(q => q.where("name", "=", "David").and("age", ">", 100));
    expect(rows).toBeDefined();
    expect(rows.length).toBeGreaterThan(0);
  });

  it("can where and order limit", async () => {
    const rows = await bigTable.getRows(q =>
      q.where("name", "=", "David").and("age", ">", 100).orderBy("name").limit(1)
    );
    expect(rows).toBeDefined();
    expect(rows.length).toBeGreaterThan(0);
  });

  it("can where row ids", async () => {
    const rows = await bigTable.getRows(q => q.where("$rowID", "=", "Z03p2HBcRxuIuK-5CM8GNQ"));
    expect(rows.length).toBe(1);
  });

  it("can get a single row with querying", async () => {
    const row = await bigTable.getRow("Z03p2HBcRxuIuK-5CM8GNQ");
    expect(row).toBeDefined();
  });
});
