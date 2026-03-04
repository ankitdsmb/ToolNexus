#!/usr/bin/env node
import { certifyTool } from './certification-engine.js';

const slug = process.argv[2];

try {
  const result = await certifyTool(slug);

  if (result.passed) {
    console.log(`✅ Tool "${result.slug}" certified.`);
  } else {
    console.error(`❌ Tool "${result.slug}" failed certification.`);
    for (const [name, check] of Object.entries(result.checks)) {
      if (!check.passed) {
        console.error(`\n[${name}] ${check.status}`);
        for (const issue of check.issues) {
          console.error(`- ${issue}`);
        }
      }
    }
    process.exitCode = 1;
  }

  console.log(`Certificate written: ${result.certificatePath}`);
} catch (error) {
  console.error(`❌ Certification error: ${error.message}`);
  process.exitCode = 1;
}
