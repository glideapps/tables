#!/usr/bin/env node

import { writeFileSync } from "fs";
import { appDefinition } from ".";

import makePrompt from "prompt-sync";
import kebabCase from "lodash/kebabCase";
import { Glide } from "../Glide";

const prompt = makePrompt();

function getToken(): string {
  let token = process.env.GLIDE_TOKEN;
  if (token === undefined) {
    token = prompt("Glide Secret Token: ");
  }
  return token!;
}

function getAppID(args = process.argv) {
  let [, , appID] = args;
  if (appID === undefined) {
    appID = prompt("App ID: ");
  }
  return appID;
}

async function getOutFile(glide: Glide, appID: string, args = process.argv) {
  let [, , , outFile] = args;
  if (outFile === undefined) {
    const apps = await glide.getApps();
    const app = apps!.find(app => app.id === appID);
    const defaultFilename = `${kebabCase(app!.name)}.ts`;
    outFile = prompt(`TypeScript file [${defaultFilename}]: `);
    if (outFile === "") outFile = defaultFilename;
  }
  return outFile;
}

async function main(args: string[]) {
  const token = getToken();
  const appID = getAppID(args);

  const glide = new Glide({ token });
  const outFile = await getOutFile(glide, appID, args);
  const definition = await appDefinition(glide, { id: appID });

  writeFileSync(outFile, definition);
}

main(process.argv);
