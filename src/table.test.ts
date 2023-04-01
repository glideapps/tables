import * as glide from ".";

const app = glide.app({
  id: "bAFxpGXU1bHiBgUMcDgn",
  token: process.env.GLIDE_TOKEN,
});

const inventory = app.table({
  table: "native-table-teiOYU20237M20abgai5",
  columns: {
    Item: "string",
    Description: "string",
    Price: "number",
  },
});

describe("table", () => {
  it("can get rows", async () => {
    const rows = await inventory.getRows();
    expect(rows).toBeDefined();
    expect(rows[0]).toBeDefined();
    expect(rows[0].Item).toBeDefined();
    expect(rows[0].Description).toBeDefined();
    expect(rows[0].Price).toBeDefined();
  });

  it("can add a row", async () => {
    const row = await inventory.addRow({
      Item: "Test Item",
      Description: "Test Description",
      Price: 100,
    });
    expect(row).toBeDefined();
  });
});
