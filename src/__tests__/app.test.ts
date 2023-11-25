require("dotenv").config();

import * as glide from "..";

import _ from "lodash";
import { app, staging } from "./common";

describe("app", () => {
  it("can get apps", async () => {
    const apps = await glide.getApps({ endpoint: staging });
    expect(apps?.length).toBeGreaterThan(0);
  });

  it("can get an app by name", async () => {
    const app = await glide.getAppNamed("API Testing", { endpoint: staging });
    expect(app).toBeDefined();
  });

  it("can get tables", async () => {
    const tables = await app.getTables();
    expect(tables).toBeDefined();
    expect(tables?.length).toBeGreaterThan(0);
  });

  it("can get a table by name", async () => {
    const table = await app.getTableNamed("Things");
    expect(table).toBeDefined();
  });
});
