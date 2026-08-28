export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startPartyScannerSchedule } = await import(
      "@/lib/electoral/partyRegistryServer"
    );
    const { startWeightsSchedule } = await import(
      "@/lib/weights/weightServiceServer"
    );
    const { startRefreshSchedule, generateAgentsIfNeeded } = await import(
      "@/lib/refresh/dailyRefresh"
    );

    startPartyScannerSchedule();
    startWeightsSchedule();
    generateAgentsIfNeeded().catch((e) =>
      console.error("[agents] boot generate failed", e),
    );
    startRefreshSchedule();
  }
}
