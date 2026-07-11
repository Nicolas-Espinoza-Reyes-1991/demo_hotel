import { afterEach, describe, expect, it, vi } from "vitest";
import { buildRootMetadata } from "./seo-metadata";

describe("buildRootMetadata assets", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sin NEXT_PUBLIC_BASE_PATH usa /logo y /manifest (dev local)", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "");
    const meta = buildRootMetadata();
    expect(meta.manifest).toBe("/manifest.webmanifest");
    expect(meta.icons).toMatchObject({
      icon: "/logo-casona.webp",
      apple: "/logo-casona.webp",
    });
  });

  it("con basePath /reservas prefija icon y manifest", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/reservas");
    const meta = buildRootMetadata();
    expect(meta.manifest).toBe("/reservas/manifest.webmanifest");
    expect(meta.icons).toMatchObject({
      icon: "/reservas/logo-casona.webp",
      apple: "/reservas/logo-casona.webp",
    });
  });
});
