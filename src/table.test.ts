require("dotenv").config();

import * as glide from ".";
import type { RowOf } from ".";

const token = process.env.GLIDE_TOKEN!;

const app = glide.app({
  id: "bAFxpGXU1bHiBgUMcDgn",
  token,
});

const inventory = app.table({
  table: "native-table-teiOYU20237M20abgai5",
  columns: {
    Item: "string",
    DescriptionRenamed: { type: "string", name: "Description" },
    Price: "number",
  },
});

const inventoryStaging = glide.table({
  token: process.env.GLIDE_TOKEN_STAGING,
  app: "xijMuHE11kxVRXoMRzd6",
  table: "native-table-1PvO9KogUzGdhVvg5gwk",
  endpoint: "https://staging.heyglide.com/api/container",
  columns: {
    Name: "string",
  },
});

describe("app", () => {
  it("can get apps", async () => {
    const apps = await glide.getApps();
    expect(apps).toBeDefined();
    expect(apps?.length).toBeGreaterThan(0);
  });

  it("can get an app by name", async () => {
    const app = await glide.getAppNamed("API Testing");
    expect(app).toBeDefined();
  });

  it("can get tables", async () => {
    const tables = await app.getTables();
    expect(tables).toBeDefined();
    expect(tables?.length).toBeGreaterThan(0);
  });

  it("can get a table by name", async () => {
    const table = await app.getTableNamed("Inv - Inventory");
    expect(table).toBeDefined();
  });
});

describe("table", () => {
  jest.setTimeout(60_000);

  it("can get rows", async () => {
    const rows = await inventory.getRows();
    expect(rows).toBeDefined();
    expect(rows[0]).toBeDefined();
    expect(rows[0].Item).toBeDefined();
    expect(rows[0].DescriptionRenamed).toBeDefined();
    expect(rows[0].Price).toBeDefined();
  });

  it("can get rows on staging", async () => {
    const rows = await inventoryStaging.getRows();
    expect(rows).toBeDefined();
  });

  it("can get the row type", async () => {
    // This test doesn't actually do anything, but it's here to show that the
    // type can be constructed. Put your cursor over it to check.
    type InventoryItem = RowOf<typeof inventory>;
  });

  it("can add a row", async () => {
    const rowID = await inventory.addRow({
      Item: "Test Item",
      DescriptionRenamed: "Test Description",
      Price: 100,
    });
    expect(rowID).toBeDefined();
  });

  it("can add multiple rows", async () => {
    const rowIDs = await inventory.addRows([
      {
        Item: "Test Item 1",
        DescriptionRenamed: "Test Description",
        Price: 100,
      },
      {
        Item: "Test Item 2",
        DescriptionRenamed: "Test Description",
        Price: 100,
      },
    ]);
    expect(rowIDs.length).toBe(2);
  });

  it("can add then delete a row", async () => {
    const rowID = await inventory.addRow({
      Item: "Test Item",
      DescriptionRenamed: "Test Description",
      Price: 100,
    });
    expect(rowID).toBeDefined();

    await inventory.deleteRow(rowID);
  });

  it("can add then change a row", async () => {
    const rowID = await inventory.addRow({
      Item: "Test Item",
      DescriptionRenamed: "Test Description",
      Price: 100,
    });

    expect(rowID).toBeDefined();

    await inventory.setRow(rowID, { Item: "Renamed" });

    // wait to allow the row to be updated
    await new Promise(resolve => setTimeout(resolve, 5_000));

    const renamed = await inventory.getRow(rowID);
    expect(renamed?.Item).toBe("Renamed");
  });

  it("can get schema", async () => {
    const {
      data: { columns },
    } = await inventory.getSchema();
    expect(columns).toBeTruthy();
  });
});
