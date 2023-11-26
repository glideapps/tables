require("dotenv").config();

import _ from "lodash";

import { staging, token, table } from "./common";
import { appDefinition, tableDefinition } from "../client-generator";

describe("client-generator", () => {
  it("can generate a table declaration", async () => {
    const props = {
      app: table.app,
      table: table.id,
      columns: {},
      token,
      endpoint: "https://staging.heyglide.com/api/container",
      endpointREST: staging,
    };
    const declaration = await tableDefinition(props);
    expect(declaration).toBeDefined();
    console.log(declaration);
  });
  it("can generate an app declaration", async () => {
    const props = {
      id: table.app,
      token,
      endpoint: "https://staging.heyglide.com/api/container",
      endpointREST: staging,
    };
    const declaration = await appDefinition(props);
    expect(declaration).toBeDefined();
    console.log(declaration);
  });
});
