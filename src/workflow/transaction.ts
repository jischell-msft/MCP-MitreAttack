import { Database } from 'better-sqlite3';
import { Logger } from '../utils/logger';

const logger = new Logger('Transaction');

/**
 * Executes a database operation within a transaction
 * @param db The database connection
 * @param operation The operation to execute within the transaction
 * @returns The result of the operation
 */
export async function executeWithTransaction<T>(
    db: Database,
    operation: (db: Database) => Promise<T>
): Promise<T> {
    try {
        // Begin transaction
        await db.run('BEGIN TRANSACTION');

        // Execute the operation
        const result = await operation(db);

        // Commit transaction
        await db.run('COMMIT');

        return result;
    } catch (error) {
        // Rollback transaction on error
        try {
            await db.run('ROLLBACK');
        } catch (rollbackError) {
            logger.error('Failed to rollback transaction', {
                originalError: error.message,
                rollbackError: rollbackError.message
            });
        }

        throw error;
    }
}

/**
 * Creates a transaction handler that can be used to perform multiple operations
 * within the same transaction
 */
export function createTransactionHandler(db: Database) {
    let isInTransaction = false;

    return {
        /**
         * Begin a transaction
         */
        async begin(): Promise<void> {
            if (isInTransaction) {
                throw new Error('Transaction already in progress');
            }

            await db.run('BEGIN TRANSACTION');
            isInTransaction = true;
        },

        /**
         * Commit the current transaction
         */
        async commit(): Promise<void> {
            if (!isInTransaction) {
                throw new Error('No transaction in progress');
            }

            await db.run('COMMIT');
            isInTransaction = false;
        },

        /**
         * Rollback the current transaction
         */
        async rollback(): Promise<void> {
            if (!isInTransaction) {
                throw new Error('No transaction in progress');
            }

            await db.run('ROLLBACK');
            isInTransaction = false;
        },

        /**
         * Run a function within the current transaction
         */
        async run<T>(fn: () => Promise<T>): Promise<T> {
            const needsTransaction = !isInTransaction;

            if (needsTransaction) {
                await this.begin();
            }

            try {
                const result = await fn();

                if (needsTransaction) {
                    await this.commit();
                }

                return result;
            } catch (error) {
                if (needsTransaction && isInTransaction) {
                    await this.rollback();
                }

                throw error;
            }
        }
    };
}
