#!/usr/bin/env node

import { writeFileSync } from "node:fs";

const baseUrl =
  "https://raw.githubusercontent.com/algorandfoundation/registered-authenticators/main/.well-known";

const files = ["assetlinks.json", "apple-app-site-association"];

for (const file of files) {
  const res = await fetch(`${baseUrl}/${file}`);
  if (!res.ok) {
    console.warn(
      `[update-well-known] Skipping ${file}: ${res.status} ${res.statusText}`,
    );
    continue;
  }
  const body = await res.text();
  writeFileSync(`./${file}`, body);
}
