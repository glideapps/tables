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
  },
});

// Get all rows
const rows = await inventory.getRows();

// Add a row
const rowID = await inventory.addRow({
  Item: "Test Item",
  Description: "Test Description",
  Price: 100,
});
```

## Development

```shell
nvm i
npm run build
npm t
```
