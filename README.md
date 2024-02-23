# Glide Tables Client

## Setup

Install package:

```shell
npm install @glideapps/tables
```

Import it:

```ts
import * as glide from "@glideapps/tables";
```

Generate a client:

```shell
# Interactive:
npx @glideapps/tables

# One-shot
GLIDE_TOKEN=... npx @glideapps/tables [APP_ID] [FILE_NAME]
```

## Authorization

Set `GLIDE_TOKEN` environment variable or pass the token as props.

Using a particular client? Add `GLIDE_CLIENT_ID` environment variable or pass the value as props.

## Apps

```ts
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

// Get PWA manifest (name, description, icons)
const manifest = await myApp.getManifest();
```

## Tables

```ts
const inventory = glide.table({
  // App and table IDs
  app: "bAF...Dgn",
  table: "native-table-tei...",

  columns: {
    // Column names map to their types.
    // You can use this shorthand with internal names only.
    Item: "string",
    Price: "number",

    // When you want to work with display names, you'll need
    // to alias them like this.
    Assignee: { type: "string", name: "7E42F8B3-9988-436E-84D2-5B3B0B22B21F" },
  },
});

// Get all rows (Business+)
const rows = await inventory.get();

// Query rows – Big Tables only (Business+)
const rows = await inventory.get(q => q.where("Price", ">", 100));

// Add a row
const rowID = await inventory.add({
  Item: "Test Item",
  Price: 100,
  Assignee: "David",
});

// Add many rows
await inventory.add([jacket, shirt, shoes]);

// Change a row
await inventory.update(rowID, {
  Price: 200,

  // Use null to clear columns
  Assignee: null,
});

// Delete a row
await inventory.delete(rowID);

// Clear all rows (Business+)
await inventory.clear();
```

### Schema & Types

```ts
// Get table schema info (columns with names and types)
const schema = await inventory.getSchema();

// Name the row type (optional)
type InventoryItem = glide.RowOf<typeof inventory>;
```

## Queries

Big Tables can be queried using SQL.

```ts
const first10 = await items.get(q => q.limit(10));

const cheapest = await items.get(q => q.orderBy("Price"));

const expensiveInLA = await items.get(
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

You can specify an alternate Glide environment (for internal testing by Glide).

```ts
const staging = new Glide({
  endpoint: "https://staging.heyglide.com/api/container",
  /* ... */
});
```

Or with the package:

```ts
import * as glide from "@glideapps/tables";

const staging = glide.withConfig({
  endpoint: "https://staging.heyglide.com/api/container",
  /* ... */
});
```