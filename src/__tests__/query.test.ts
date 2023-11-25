require("dotenv").config();

import _ from "lodash";
import { bigTable } from "./common";

beforeAll(async () => {
  await bigTable.clear();
  await bigTable.addRows([
    { name: "Mark", age: 0, otherName: "Marcus" },
    { name: "Jason", age: 100, otherName: "JSON" },
    { name: "David", age: 300, otherName: "David" },
  ]);
});

afterAll(async () => {
  await bigTable.clear();
});

describe("query", () => {
  jest.setTimeout(60_000);

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
    expect(rows.length).toBe(1);
  });

  it("can compare columns", async () => {
    const rows = await bigTable.getRows(q => q.where("name", "=", "otherName"));
    expect(rows?.length).toBe(1);
  });

  it("can where and", async () => {
    const rows = await bigTable.getRows(q => q.where("name", "=", "David").and("age", ">", 100));
    expect(rows.length).toBe(1);
  });

  it("can where and order limit", async () => {
    const rows = await bigTable.getRows(q =>
      q.where("name", "=", "David").and("age", ">", 100).orderBy("name").limit(1)
    );
    expect(rows).toBeDefined();
    expect(rows.length).toBeGreaterThan(0);
  });

  it("can where row ids", async () => {
    const [row] = await bigTable.getRows(q => q.limit(1));

    const rows = await bigTable.getRows(q => q.where("$rowID", "=", row.$rowID));
    expect(rows.length).toBe(1);
  });

  it("can get a single row with querying", async () => {
    const rows = await bigTable.getRows(q => q.limit(1));

    const row = await bigTable.getRow(rows[0].$rowID);
    expect(row).toBeDefined();
  });
});
