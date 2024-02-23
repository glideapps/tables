require("dotenv").config();

import { appWithClient } from "./test-common";

test("sanity", async () => {
  const table = await appWithClient.getTableNamed("Things");
  expect(table).toBeDefined();
});
