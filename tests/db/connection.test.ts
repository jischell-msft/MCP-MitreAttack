import { getDatabase, closeDatabase, executeTransaction } from '../../src/db/connection';
import fs from 'fs';
import path from 'path';

// Use in-memory database for tests
jest.mock('../../src/config', () => ({
    DB_CONFIG: {
        path: ':memory:',
        debug: false,
        migrationDir: path.join(process.cwd(), 'src', 'db', 'migrations'),
        schemaPath: path.join(process.cwd(), 'src', 'db', 'schema.sql')
    }
}));

describe('Database Connection', () => {
    afterEach(() => {
        closeDatabase();
    });

    it('should create a database connection', () => {
        const db = getDatabase();
        expect(db).toBeDefined();
    });

    it('should reuse the same connection', () => {
        const db1 = getDatabase();
        const db2 = getDatabase();
        expect(db1).toBe(db2);
    });

    it('should execute statements', () => {
        const db = getDatabase();
        db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');

        const stmt = db.prepare('INSERT INTO test (name) VALUES (?)');
        const result = stmt.run('test name');

        expect(result.changes).toBe(1);
    });

    it('should execute transactions', () => {
        const db = getDatabase();
        db.exec('CREATE TABLE test_tx (id INTEGER PRIMARY KEY, name TEXT)');

        const result = executeTransaction(db => {
            const insert = db.prepare('INSERT INTO test_tx (name) VALUES (?)');
            insert.run('tx test 1');
            insert.run('tx test 2');
            return true;
        });

        expect(result).toBe(true);

        const count = db.prepare('SELECT COUNT(*) as count FROM test_tx').get() as { count: number };
        expect(count.count).toBe(2);
    });

    it('should rollback transactions on error', () => {
        const db = getDatabase();
        db.exec('CREATE TABLE test_rollback (id INTEGER PRIMARY KEY, name TEXT)');

        try {
            executeTransaction(db => {
                const insert = db.prepare('INSERT INTO test_rollback (name) VALUES (?)');
                insert.run('should be rolled back');
                throw new Error('Test error');
            });
        } catch (e) {
            // Expected error
        }

        const count = db.prepare('SELECT COUNT(*) as count FROM test_rollback').get() as { count: number };
        expect(count.count).toBe(0);
    });
});
