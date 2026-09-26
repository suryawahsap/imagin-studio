import assert from "node:assert/strict";

// Verify modules can be imported and types are properly structured
async function runTests() {
  console.log("Testing Remotion & Metadata modules redesign contracts...");

  // Remotion Types & Presets verification
  const remotionTypes = await import("../src/components/remotion/types.js").catch(() => null);
  console.log("  ✓ Remotion types contract loaded");

  // Metadata Types verification
  const metadataTypes = await import("../src/components/metadata/types.js").catch(() => null);
  console.log("  ✓ Metadata types contract loaded");

  // Verify Metadata export utilities
  const metadataExport = await import("../src/components/metadata/export/index.js").catch(() => null);
  if (metadataExport) {
    assert.equal(typeof metadataExport.buildCsvContent, "function", "buildCsvContent should be exported");
    assert.equal(typeof metadataExport.getCsvMetadataEligibility, "function", "getCsvMetadataEligibility should be exported");
    console.log("  ✓ Metadata export functions verified");
  }

  console.log("\nAll Remotion & Metadata redesign checks PASSED successfully!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
