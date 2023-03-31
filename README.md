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

const rows = await inventory.getAllRows();
```

## Development

```shell
nvm i
npm run build
npm t
```
