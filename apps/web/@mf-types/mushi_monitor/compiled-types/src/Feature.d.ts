type MacMetrics = {
    recordedAt: string;
    cpuPercent: number;
    cpuCores: number;
    memoryUsedBytes: number;
    memoryTotalBytes: number;
    diskUsedBytes: number;
    diskTotalBytes: number;
    uptimeSeconds: number;
    processCount: number;
};
type Status = {
    status: 'online' | 'offline' | 'unknown';
    lastSeenAt: string | null;
    macMetrics?: MacMetrics | null;
    bridge?: {
        reachable: boolean;
        checkedAt: string;
        error?: string;
    } | null;
};
export default function Feature({ loadStatus }: {
    loadStatus?: () => Promise<Status>;
}): import("react").JSX.Element;
export {};
