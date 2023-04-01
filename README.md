# Glide Tables Client

## Usage

```ts
import * as glide from "@glideapps/tables";

const inventory = glide.table({
  token: process.env.GLIDE_TOKEN,

  app: "bAFxpGXU1bHiBgUMcDgn",
  table: "native-table-teiOYU20237M20abgai5",

  columns: {
    Item: "string",
    Description: "string",
    Price: "number",

    // Handle internal column names != display names
    Assignee: { type: "string", name: "7E42F8B3-9988-436E-84D2-5B3B0B22B21F" },
  },
});

// Get all rows
const rows = await inventory.getRows();

// Add a row
const rowID = await inventory.addRow({
  Item: "Test Item",
  Description: "Test Description",
  Price: 100,
  Assignee: "David",
});

// Change a row
await inventory.setRow(rowID, {
  Price: 200,
});

// Delete a row
await inventory.deleteRow(rowID);
```

## Development

```shell
nvm i
npm run build
npm t
```
