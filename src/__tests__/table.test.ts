require("dotenv").config();

import { RowOf } from "../types";
import { bigBigTable, table, sleep } from "./test-common";

describe("table", () => {
  jest.setTimeout(60_000);

  it("can get rows", async () => {
    const rows = await table.get();
    expect(rows).toBeDefined();
  });

  it("can get more than 10k rows", async () => {
    const rows = await bigBigTable.get();
    expect(rows.length).toBeGreaterThan(10_000);
  });

  it("can get the row type", async () => {
    // This test doesn't actually do anything, but it's here to show that the
    // type can be constructed. Put your cursor over it to check.
    type InventoryItem = RowOf<typeof table>;
  });

  it("can add a row", async () => {
    const rowID = await table.add({
      name: "Test Item",
      renamed: "Test Description",
      stock: 100,
    });
    expect(rowID).toBeDefined();

    await table.delete(rowID);
  });

  it("can add multiple rows", async () => {
    const rowIDs = await table.add([{}, {}]);
    expect(rowIDs.length).toBe(2);

    await table.delete(rowIDs);
  });

  it("can add then change a row", async () => {
    const rowID = await table.add({});

    expect(rowID).toBeDefined();

    await table.update(rowID, { name: "Renamed" });

    // wait to allow the row to be updated
    await sleep(5_000);

    const renamed = await table.get(rowID);
    expect(renamed?.name).toBe("Renamed");

    await table.delete(rowID);
  });

  it("can clear columns", async () => {
    const rowID = await table.add({ name: "Delete me" });
    await sleep(1_000);

    await table.update(rowID, { name: null });
    await sleep(1_000);

    const renamed = await table.get(rowID);
    expect(renamed?.name).toBeUndefined();

    await table.delete(rowID);
  });

  it("can get schema", async () => {
    const {
      data: { columns },
    } = await table.getSchema();
    expect(columns).toBeTruthy();
  });
});
