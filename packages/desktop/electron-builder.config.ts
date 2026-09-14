import { execFile } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

import type { Configuration } from "electron-builder"

const execFileAsync = promisify(execFile)
const packageDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(packageDir, "../..")
const signScript = path.join(rootDir, "script", "sign-windows.ps1")
// The Electron 42 packaging update briefly installed Linux launchers/icons under
// "opencode-desktop". Keep that hidden desktop entry around so existing GNOME/KDE
// pins still resolve after the canonical app id changes back to ai.opencode.desktop.
const legacyDesktopEntry = path.join(packageDir, "resources", "linux", "opencode-desktop.desktop")
const legacyDesktopEntryFpm = `${legacyDesktopEntry}=/usr/share/applications/opencode-desktop.desktop`

const metainfoFpm = (appId: string) =>
  `${path.join(packageDir, "resources", `${appId}.metainfo.xml`)}=/usr/share/metainfo/${appId}.metainfo.xml`

async function signWindows(configuration: { path: string }) {
  if (process.platform !== "win32") return
  if (process.env.GITHUB_ACTIONS !== "true") return

  await execFileAsync(
    "pwsh",
    ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", signScript, configuration.path],
    { cwd: rootDir },
  )
}

const channel = (() => {
  const raw = process.env.OPENCODE_CHANNEL
  if (raw === "dev" || raw === "beta" || raw === "prod") return raw
  return "dev"
})()

const APP_IDS = {
  dev: "ai.aog.hub.dev",
  beta: "ai.aog.hub.beta",
  prod: "ai.aog.hub",
} as const

const getBase = (appId: string): Configuration => ({
  artifactName: "aog-hub-${os}-${arch}.${ext}",
  directories: {
    output: "dist",
    buildResources: "resources",
  },
  // Linux launchers are .desktop files, so this is the desktop file name,
  // not just the app id. For prod, app id "ai.opencode.desktop" becomes
  // "ai.opencode.desktop.desktop".
  // https://developer.gnome.org/documentation/guidelines/maintainer/integrating.html
  // https://www.electron.build/docs/linux/
  extraMetadata: {
    desktopName: `${appId}.desktop`,
  },
  files: ["out/**/*", "resources/**/*", "!resources/opencode-cli*"],
  extraResources: [
    ...(channel === "dev"
      ? [
          {
            from: "resources/",
            to: "",
            filter: ["opencode-cli*"],
          },
        ]
      : []),
    {
      from: "native/",
      to: "native/",
      filter: ["index.js", "index.d.ts", "build/Release/mac_window.node", "swift-build/**"],
    },
  ],
  mac: {
    category: "public.app-category.developer-tools",
    icon: `resources/icons/icon.icns`,
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "resources/entitlements.plist",
    entitlementsInherit: "resources/entitlements.plist",
    notarize: true,
    target: ["dmg", "zip"],
  },
  dmg: {
    sign: true,
  },
  protocols: {
    name: "Hub",
    schemes: ["hub"],
  },
  win: {
    icon: `resources/icons/icon.ico`,
    signtoolOptions: {
      sign: signWindows,
    },
    target: ["nsis"],
    verifyUpdateCodeSignature: false,
  },
  nsis: {
    oneClick: true,
    perMachine: false,
    installerIcon: `resources/icons/icon.ico`,
    installerHeaderIcon: `resources/icons/icon.ico`,
    // Never remove user data on uninstall, and never mistake the upstream
    // OpenCode install for ours: separate folders, separate identity.
    deleteAppDataOnUninstall: false,
  },
  linux: {
    icon: `resources/icons`,
    category: "Development",
    executableName: appId,
    desktop: {
      entry: {
        // Match the installed .desktop file and hicolor icon basename so
        // Linux shells can associate the running Electron window with its launcher.
        StartupWMClass: appId,
      },
    },
    target: ["AppImage", "deb", "rpm"],
  },
})

function getConfig() {
  const appId = APP_IDS[channel]
  const base = getBase(appId)

  // Explicit per-channel GUIDs so Windows Add/Remove Programs (and the
  // installer's running-app detection) can never confuse Hub with the
  // upstream OpenCode desktop installed on the same machine.
  const guids = {
    dev: "1103e8d8-a5f6-420b-88b3-d30ff134ca97",
    beta: "d6698073-6f30-462d-8748-3343f9220aee",
    prod: "9d5c6de1-b14d-4ac8-bc8c-2bff0b6c9aab",
  } as const

  switch (channel) {
    case "dev": {
      return {
        ...base,
        appId,
        productName: "[AoG] Hub Dev",
        nsis: {
          ...base.nsis,
          guid: guids.dev,
          uninstallDisplayName: "[AoG] Hub Dev",
        },
        deb: { fpm: [metainfoFpm(appId)] },
        rpm: { packageName: "aog-hub-dev", fpm: [metainfoFpm(appId)] },
      }
    }
    case "beta": {
      return {
        ...base,
        appId,
        productName: "[AoG] Hub Beta",
        protocols: { name: "[AoG] Hub Beta", schemes: ["hub"] },
        publish: { provider: "github", owner: "FireDevOps", repo: "opencode", channel: "latest" },
        nsis: {
          ...base.nsis,
          guid: guids.beta,
          uninstallDisplayName: "[AoG] Hub Beta",
        },
        deb: { fpm: [metainfoFpm(appId)] },
        rpm: { packageName: "aog-hub-beta", fpm: [metainfoFpm(appId)] },
      }
    }
    case "prod": {
      return {
        ...base,
        appId,
        productName: "[AoG] Hub",
        protocols: { name: "[AoG] Hub", schemes: ["hub"] },
        publish: { provider: "github", owner: "FireDevOps", repo: "opencode", channel: "latest" },
        nsis: {
          ...base.nsis,
          guid: guids.prod,
          uninstallDisplayName: "[AoG] Hub",
        },
        deb: { fpm: [metainfoFpm(appId), legacyDesktopEntryFpm] },
        rpm: { packageName: "aog-hub", fpm: [metainfoFpm(appId), legacyDesktopEntryFpm] },
      }
    }
  }
}

export default getConfig()
