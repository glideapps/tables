require("dotenv").config();

import _ from "lodash";

import { glideStaging, table } from "./test-common";
import { appDefinition, tableDefinition } from "../client-generator";

describe("client-generator", () => {
  it("can generate a table declaration", async () => {
    const props = {
      app: table.app,
      table: table.id,
      columns: {},
    };
    const declaration = await tableDefinition(glideStaging, props);
    expect(declaration).toBeDefined();
    console.log(declaration);
  });
  it("can generate an app declaration", async () => {
    const props = {
      id: table.app,
    };
    const declaration = await appDefinition(glideStaging, props);
    expect(declaration).toBeDefined();
    console.log(declaration);
  });
});
