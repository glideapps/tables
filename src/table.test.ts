import * as glide from ".";

const app = glide.app({
  id: "bAFxpGXU1bHiBgUMcDgn",
  token: process.env.GLIDE_TOKEN,
});

const inventory = app.table({
  table: "native-table-teiOYU20237M20abgai5",
  columns: {
    Item: "string",
    DescriptionRenamed: { type: "string", name: "Description" },
    Price: "number",
  },
});

describe("table", () => {
  it("can get rows", async () => {
    const rows = await inventory.getRows();
    expect(rows).toBeDefined();
    expect(rows[0]).toBeDefined();
    expect(rows[0].Item).toBeDefined();
    expect(rows[0].DescriptionRenamed).toBeDefined();
    expect(rows[0].Price).toBeDefined();
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
});
