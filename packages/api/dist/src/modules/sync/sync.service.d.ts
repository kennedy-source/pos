import { PrismaService } from '../../prisma/prisma.service';
export interface SyncPayload {
    deviceId: string;
    lastSyncAt: string;
    operations: SyncOperation[];
}
export interface SyncOperation {
    id: string;
    entityType: string;
    entityId: string;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    payload: Record<string, any>;
    timestamp: string;
}
export declare class SyncService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    pushOperations(payload: SyncPayload): Promise<{
        results: {
            id: string;
            success: boolean;
            error?: string;
        }[];
        syncedAt: string;
    }>;
    pullChanges(lastSyncAt: string, entityTypes?: string[]): Promise<{
        changes: Record<string, any[]>;
        serverTime: string;
    }>;
    private getChangedRecords;
    private applyOperation;
    private syncSale;
    private syncEmbroideryJob;
    private syncInventoryTransaction;
    private syncCustomer;
}
