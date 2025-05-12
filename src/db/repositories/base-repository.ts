import { getDatabase, DatabaseInstance, RunResult } from '../connection';

/**
 * Generic repository interface
 */
export interface Repository<T> {
    findById(id: string): T | null;
    findAll(): T[];
    create(entity: T): string;
    update(id: string, entity: Partial<T>): boolean;
    delete(id: string): boolean;
    count(): number;
}

/**
 * Base repository class implementing common CRUD operations
 */
export abstract class BaseRepository<T> implements Repository<T> {
    protected tableName: string;
    protected db: DatabaseInstance;
    protected idColumn: string;

    constructor(tableName: string, idColumn: string = 'id') {
        this.tableName = tableName;
        this.idColumn = idColumn;
        this.db = getDatabase();
    }

    /**
     * Find entity by ID
     */
    findById(id: string): T | null {
        try {
            const query = `SELECT * FROM ${this.tableName} WHERE ${this.idColumn} = ?`;
            const result = this.db.prepare(query).get(id) as T | undefined;
            return result || null;
        } catch (error) {
            console.error(`Error in findById: ${error}`);
            return null;
        }
    }

    /**
     * Find all entities in the table
     */
    findAll(): T[] {
        try {
            const query = `SELECT * FROM ${this.tableName}`;
            return this.db.prepare(query).all() as T[];
        } catch (error) {
            console.error(`Error in findAll: ${error}`);
            return [];
        }
    }

    /**
     * Create a new entity
     * @returns ID of the created entity
     */
    abstract create(entity: T): string;

    /**
     * Update an existing entity
     * @returns success indicator
     */
    abstract update(id: string, entity: Partial<T>): boolean;

    /**
     * Delete an entity by ID
     */
    delete(id: string): boolean {
        try {
            const query = `DELETE FROM ${this.tableName} WHERE ${this.idColumn} = ?`;
            const result = this.db.prepare(query).run(id) as RunResult;
            return result.changes > 0;
        } catch (error) {
            console.error(`Error in delete: ${error}`);
            return false;
        }
    }

    /**
     * Count total number of entities
     */
    count(): number {
        try {
            const query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
            const result = this.db.prepare(query).get() as { count: number };
            return result.count;
        } catch (error) {
            console.error(`Error in count: ${error}`);
            return 0;
        }
    }

    /**
     * Build a query with pagination
     */
    protected buildPaginatedQuery(baseQuery: string, page: number, limit: number): string {
        const offset = (page - 1) * limit;
        return `${baseQuery} LIMIT ${limit} OFFSET ${offset}`;
    }

    /**
     * Helper to build WHERE clauses with filters
     */
    protected buildWhereClause(filters: Record<string, any>): { whereClause: string, params: any[] } {
        const conditions: string[] = [];
        const params: any[] = [];

        for (const [key, value] of Object.entries(filters)) {
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    if (value.length > 0) {
                        const placeholders = value.map(() => '?').join(',');
                        conditions.push(`${key} IN (${placeholders})`);
                        params.push(...value);
                    }
                } else {
                    conditions.push(`${key} = ?`);
                    params.push(value);
                }
            }
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        return { whereClause, params };
    }
}
