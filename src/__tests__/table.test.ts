require("dotenv").config();

import type { RowOf } from "..";

import { bigBigTable, table } from "./common";

describe("table", () => {
  jest.setTimeout(60_000);

  it("can get rows", async () => {
    const rows = await table.getRows();
    expect(rows).toBeDefined();
  });

  it("can get more than 10k rows", async () => {
    const rows = await bigBigTable.getRows();
    expect(rows.length).toBeGreaterThan(10_000);
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

    await table.deleteRow(rowID);
  });

  it("can add multiple rows", async () => {
    const rowIDs = await table.addRows([{}, {}]);
    expect(rowIDs.length).toBe(2);

    await table.deleteRows(rowIDs);
  });

  it("can add then change a row", async () => {
    const rowID = await table.addRow({});

    expect(rowID).toBeDefined();

    await table.setRow(rowID, { name: "Renamed" });

    // wait to allow the row to be updated
    await new Promise(resolve => setTimeout(resolve, 5_000));

    const renamed = await table.getRow(rowID);
    expect(renamed?.name).toBe("Renamed");

    await table.deleteRow(rowID);
  });

  it("can get schema", async () => {
    const {
      data: { columns },
    } = await table.getSchema();
    expect(columns).toBeTruthy();
  });
});
