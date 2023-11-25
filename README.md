# Glide Tables Client

## Authorization

Set `GLIDE_TOKEN` environment variable or pass the token as props.

## Apps

```ts
import * as glide from "@glideapps/tables";

// List all apps
const apps = await glide.getApps();

// Create a reference to an app using its ID
const myApp = glide.app("bAFxpGXU1bHiBgUMcDgn");

// Or get by name
const myApp = await glide.getAppNamed("Employee Directory");

// Get all tables
const tables = await myApp.getTables();

// Get a table by name
const users = await myApp.getTableNamed("Users");
```

## Tables

```ts
import * as glide from "@glideapps/tables";

const inventory = glide.table({
  // App and table IDs
  app: "bAF...Dgn",
  table: "native-table-tei...",

  columns: {
    // Column names map to their types
    Item: "string",
    Price: "number",

    // Alias internal names
    Assignee: { type: "string", name: "7E42F8B3-9988-436E-84D2-5B3B0B22B21F" },
  },
});

// Name the row type (optional)
type InventoryItem = glide.RowOf<typeof inventory>;

// Get all rows.
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

// Clear entire table
await inventory.clear();
```

### Schema

```ts
// Get table schema info (columns with names and types)
const schema = await inventory.getSchema();
```

## Big Tables

Big Tables can be queried.

```ts
const first10 = await items.getRows(q => q.limit(10));

const cheapest = await items.getRows(q => q.orderBy("Price"));

const expensiveInLA = await items.getRows(
  q => q
    .orderBy("Price", "DESC")
    .where("Quantity", ">", 10_000)
    .and("Port", "=", "Los Angeles")
    .limit(100);
);
```

## Development

```shell
nvm i
npm run build
npm t
```

## Advanced Options

You can specify an alternate endpoint to use Glide's staging environment (for internal testing by Glide).

```ts
const inventoryStaging = glide.table({
  endpoint: "https://staging.heyglide.com/api/container",
  /* ... */
});
```
