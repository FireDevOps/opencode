import { $ } from "bun"
import { downloadCliToResources, ensurePinnedOpenCodeVersion } from "./utils"

const version = await ensurePinnedOpenCodeVersion()
console.log(`Building sidecar server as version ${version} (dev)`)

await $`bun run install-electron`

await $`bun ./scripts/copy-icons.ts ${process.env.OPENCODE_CHANNEL ?? "dev"}`

await $`cd ../opencode && bun script/build-node.ts`
await downloadCliToResources()
