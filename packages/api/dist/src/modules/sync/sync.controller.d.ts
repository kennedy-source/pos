import { SyncService, SyncPayload } from './sync.service';
export declare class SyncController {
    private syncService;
    constructor(syncService: SyncService);
    push(payload: SyncPayload): Promise<{
        results: {
            id: string;
            success: boolean;
            error?: string;
        }[];
        syncedAt: string;
    }>;
    pull(lastSyncAt: string, types: string): Promise<{
        changes: Record<string, any[]>;
        serverTime: string;
    }>;
}
