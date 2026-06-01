export interface E2EHarnessGateApi {
  isE2E?: boolean
}

export interface E2EHarnessModule {
  installE2EHarness(): void
}

export function installE2EHarnessIfEnabled(
  api: E2EHarnessGateApi | undefined,
  loadHarness: () => Promise<E2EHarnessModule>,
): void {
  if (!api?.isE2E) return

  void loadHarness().then((module) => {
    module.installE2EHarness()
  })
}
