#!/usr/bin/env bun
import { $ } from "bun"

import { downloadCliToResources, ensurePinnedOpenCodeVersion, resolveChannel } from "./utils"

const channel = resolveChannel()
const version = await ensurePinnedOpenCodeVersion()
console.log(`Building sidecar server as version ${version} (channel ${channel})`)
await $`bun ./scripts/copy-icons.ts ${channel}`
await $`bun ./scripts/copy-metainfo.ts ${channel}`

await $`cd ../opencode && bun script/build-node.ts`
if (channel === "dev") await downloadCliToResources()
