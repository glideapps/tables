require("dotenv").config();
import fetch from "cross-fetch";

import { appWithClient, tableWithClient } from "./test-common";

jest.mock("cross-fetch", () => jest.fn(jest.requireActual("cross-fetch") as any));

describe("client id sanity", () => {
  jest.setTimeout(60_000);

  test("get named table", async () => {
    const table = await appWithClient.getTableNamed("Things");
    const spy = (fetch as jest.Mock).mockImplementationOnce(fetch);
    const clientID = spy.mock.calls[0][1]["headers"]["X-Glide-Client-ID"];
    expect(clientID).toBeDefined();
    expect(clientID).toEqual(process.env.GLIDE_CLIENT_ID);
    expect(table).toBeDefined();
  });

  test("get schema", async () => {
    const {
      data: { columns },
    } = await tableWithClient.getSchema();
    const spy = (fetch as jest.Mock).mockImplementationOnce(fetch);
    const clientID = spy.mock.calls[0][1]["headers"]["X-Glide-Client-ID"];
    expect(clientID).toBeDefined();
    expect(clientID).toEqual(process.env.GLIDE_CLIENT_ID);
    expect(columns).toBeDefined();
  });

  it("can add a row", async () => {
    const rowID = await tableWithClient.add({
      name: "Test Item",
      renamed: "Test Description",
      stock: 100,
    });
    expect(rowID).toBeDefined();

    await tableWithClient.delete(rowID);
  });
});
