require("dotenv").config();
import fetch from "cross-fetch";

import { appWithClient, tableWithClient } from "./test-common";

jest.mock("cross-fetch", () => jest.fn(jest.requireActual("cross-fetch") as any));

test("sanity - get named table", async () => {
  const table = await appWithClient.getTableNamed("Things");
  const spy = (fetch as jest.Mock).mockImplementationOnce(fetch);
  const clientID = spy.mock.calls[0][1]["headers"]["X-Glide-Client-ID"];
  expect(clientID).toBeDefined();
  expect(clientID).toEqual(process.env.GLIDE_CLIENT_ID);
  expect(table).toBeDefined();
});

test("sanity - get named table", async () => {
  const {
    data: { columns },
  } = await tableWithClient.getSchema();
  const spy = (fetch as jest.Mock).mockImplementationOnce(fetch);
  const clientID = spy.mock.calls[0][1]["headers"]["X-Glide-Client-ID"];
  expect(clientID).toBeDefined();
  expect(clientID).toEqual(process.env.GLIDE_CLIENT_ID);
  expect(columns).toBeDefined();
});
