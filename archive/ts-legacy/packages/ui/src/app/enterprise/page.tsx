"use client";

import { EnterpriseView } from "@/components/enterprise/EnterpriseView";

export default function EnterprisePage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enterprise Management</h1>
          <p className="text-muted-foreground mt-2">
<<<<<<< HEAD:archive/ts-legacy/packages/ui/src/app/enterprise/page.tsx
            Governance, compliance, and distributed orchestration for HyperCode.
=======
            Governance, compliance, and distributed orchestration for borg.
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/ui/src/app/enterprise/page.tsx
          </p>
        </div>
      </div>
      <EnterpriseView />
    </div>
  );
}
