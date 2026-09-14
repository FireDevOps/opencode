import { describe, expect, test } from "bun:test"
import { ProviderTransform } from "@/provider/transform"
import {
  FORGE_DEFAULT_BASE_URL,
  FORGE_PROVIDER_ID,
  forgeBuiltinProvider,
  forgeDiscoveredModels,
} from "@/provider/provider"

describe("Forge built-in provider", () => {
  test("registers as AoG DevHub with key-based auth", () => {
    const provider = forgeBuiltinProvider(FORGE_DEFAULT_BASE_URL)
    expect(String(provider.id)).toBe(FORGE_PROVIDER_ID)
    expect(provider.name).toBe("AoG DevHub")
    expect(provider.env).toEqual(["FORGE_API_KEY"])
    expect(provider.options.baseURL).toBe(FORGE_DEFAULT_BASE_URL)
    expect(Object.keys(provider.models).sort()).toEqual(["big-pickle", "forge-dev-1", "forge-review-1"])
  })

  test("built-in models are reasoning-capable tool users", () => {
    const provider = forgeBuiltinProvider("https://example.com/forge/v1")
    for (const model of Object.values(provider.models)) {
      expect(model.capabilities.reasoning).toBe(true)
      expect(model.capabilities.toolcall).toBe(true)
      expect(model.api.npm).toBe("@ai-sdk/openai-compatible")
      expect(model.api.url).toBe("https://example.com/forge/v1")
      expect(model.status).toBe("active")
    }
  })

  test("built-in models offer reasoning effort variants", () => {
    const provider = forgeBuiltinProvider(FORGE_DEFAULT_BASE_URL)
    const result = ProviderTransform.variants(provider.models["big-pickle"] as any)
    expect(Object.keys(result).sort()).toEqual(["high", "low", "medium"])
    expect(result.medium).toEqual({ reasoning: { effort: "medium" } })
  })
})

describe("Forge model discovery", () => {
  test("maps OpenAI list entries with reasoning flags", () => {
    const result = forgeDiscoveredModels("https://example.com/forge/v1", [
      { id: "free-thing", name: "Free Thing", reasoning: true },
      { id: "plain-thing", name: "Plain Thing", reasoning: false },
      { id: "unnamed-thing" },
      { id: "" },
      null,
    ] as any)
    expect(Object.keys(result).sort()).toEqual(["free-thing", "plain-thing", "unnamed-thing"])
    expect(result["free-thing"].capabilities.reasoning).toBe(true)
    expect(result["free-thing"].name).toBe("Free Thing")
    expect(result["plain-thing"].capabilities.reasoning).toBe(false)
    // Missing flags default to reasoning-capable: Forge is a reasoning service.
    expect(result["unnamed-thing"].capabilities.reasoning).toBe(true)
    expect(result["unnamed-thing"].name).toBe("unnamed-thing")
    expect(String(result["free-thing"].providerID)).toBe("forge")
  })
})
