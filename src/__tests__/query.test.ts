require("dotenv").config();

import _ from "lodash";
import { bigTable } from "./common";

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
