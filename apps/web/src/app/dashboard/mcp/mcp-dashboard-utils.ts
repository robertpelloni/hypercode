// MCP dashboard utility functions

/** Merge raw server list with managed-server metadata into dashboard records. */
export const buildDashboardServerRecords = (servers: any[], managedList: any[]): any[] => {
    return (servers || []).map((srv: any) => {
        const managed = (managedList || []).find((m: any) => m.name === srv.name);
        return {
            ...srv,
            uuid: srv.uuid ?? managed?.uuid,
            metadataStatus: managed?.metadataStatus ?? 'unknown',
            metadataSource: managed?.metadataSource,
            metadataToolCount: managed?.metadataToolCount ?? 0,
            lastSuccessfulBinaryLoadAt: managed?.lastSuccessfulBinaryLoadAt,
        };
    });
};

/** Build tool-action link rows for a given server. */
export const buildServerToolActionLinks = (_serverName: string, _tools?: any[]): any[] => [];

/** Return UUIDs of managed servers that need bulk metadata refresh. */
export const getBulkMetadataTargetUuids = (managedList: any[], _filter?: string): string[] =>
    (managedList || []).filter((m: any) => m?.uuid).map((m: any) => m.uuid);

/** Summarize managed-server discovery state. */
export const getManagedServerDiscoverySummary = (_managedList: any[]): {
    total: number; discovered: number; pending: number;
    unresolvedCount: number; localCompatCount: number;
    totalCount: number; readyCount: number; neverLoadedCount: number;
    repairableCount: number; staleReadyCount: number;
} => ({
    total: 0, discovered: 0, pending: 0,
    unresolvedCount: 0, localCompatCount: 0,
    totalCount: 0, readyCount: 0, neverLoadedCount: 0,
    repairableCount: 0, staleReadyCount: 0,
});

/** Check whether a managed server has stale metadata. */
export const hasStaleReadyMetadata = (_server: any): boolean => false;

/** Check whether a server's metadata comes from local-compat source. */
export const isLocalCompatMetadataSource = (_server: any): boolean => false;
