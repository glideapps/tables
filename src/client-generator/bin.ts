#!/usr/bin/env node

import { writeFileSync } from "fs";
import { appDefinition } from ".";

import * as glide from "..";

import makePrompt from "prompt-sync";
import kebabCase from "lodash/kebabCase";

const prompt = makePrompt({ sigint: true });

function getToken() {
  let token = process.env.GLIDE_TOKEN;
  if (token === undefined) {
    token = prompt("Glide Secret Token: ");
  }
  return token;
}

function getAppID(args = process.argv) {
  let [, , appID] = args;
  if (appID === undefined) {
    appID = prompt("App ID: ");
  }
  return appID;
}

async function getOutFile(token: string, appID: string, args = process.argv) {
  let [, , , outFile] = args;
  if (outFile === undefined) {
    const apps = await glide.getApps({ token });
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
  const outFile = await getOutFile(token, appID, args);
  const definition = await appDefinition({ token, id: appID });
  writeFileSync(outFile, definition);
}

main(process.argv);
