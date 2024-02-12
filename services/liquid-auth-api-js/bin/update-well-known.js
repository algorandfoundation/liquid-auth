#!/usr/bin/env node

import {writeFileSync} from "node:fs";

const url = 'https://raw.githubusercontent.com/awesome-algorand/registered-authenticators/main/.well-known/assetlinks.json'

const body = await fetch(url).then(r=>r.text())

writeFileSync('./assetlinks.json', body)


