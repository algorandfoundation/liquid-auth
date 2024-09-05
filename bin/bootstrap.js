#!/usr/bin/env node

import { resolve } from 'node:path';
import { copyFileSync, existsSync } from 'node:fs';

const envPath = resolve('.env');
const envTemplatePath = resolve('.env.template');

if (!existsSync(envPath)) {
  copyFileSync(envTemplatePath, envPath);
}
