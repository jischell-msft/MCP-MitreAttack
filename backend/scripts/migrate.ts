import { initializeDatabase, getCurrentVersion, migrateUp, migrateDown } from '../src/db/migration';

async function main() {
    try {
        const command = process.argv[2];

        if (!command) {
            console.log('Please specify a command: init, up, down, status');
            process.exit(1);
        }

        switch (command) {
            case 'init':
                await initializeDatabase();
                break;

            case 'up': {
                const targetVersion = process.argv[3] ? parseInt(process.argv[3], 10) : undefined;
                migrateUp(targetVersion);
                break;
            }

            case 'down': {
                const steps = process.argv[3] ? parseInt(process.argv[3], 10) : 1;
                migrateDown(steps);
                break;
            }

            case 'status': {
                const version = getCurrentVersion();
                console.log(`Current database version: ${version}`);
                break;
            }

            default:
                console.log('Unknown command. Use one of: init, up, down, status');
                process.exit(1);
        }

        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
}

main();
