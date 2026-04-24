export interface Policy { }

export const policyService = {
    getPolicy: async (_policyId: string): Promise<Policy | null> => {
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/services/stubs/policy.service.stub.ts
        // Compatibility placeholder: HyperCode currently persists policy definitions through the repository/router
=======
        // Compatibility placeholder: borg currently persists policy definitions through the repository/router
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/services/stubs/policy.service.stub.ts
        // layer, but this legacy compatibility service does not yet resolve an enforcement-ready compiled
        // policy object for middleware execution. Returning null keeps older middleware hooks operational
        // without implying that a real evaluator/storage backend exists here.
        return null;
    },
    evaluateAccess: (_policy: unknown, _toolName: string): boolean => {
        // Compatibility placeholder: pass-through evaluator.
        // NOTE: This deliberately returns `true` for all calls today, which means:
        //   1. policy editing/storage UIs can be exercised without breaking older middleware paths,
        //   2. operators can stage policy intent,
        //   3. NO runtime allow/deny semantics are actually enforced through this service yet.
        // Keep operator-facing surfaces explicitly labeled as preview/audit-mode until this is replaced
        // by a real matcher/evaluator with acceptance coverage.
        return true;
    }
};
