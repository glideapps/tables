require("dotenv").config();

import { app, glideStaging as glide } from "./test-common";

describe("app", () => {
  it("can get apps", async () => {
    const apps = await glide.getApps();
    expect(apps?.length).toBeGreaterThan(0);
  });

  it("can get an app by name", async () => {
    const app = await glide.getAppNamed("API Testing");
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
