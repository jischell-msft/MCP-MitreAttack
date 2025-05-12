import { FetchAgent } from '../agents/fetch';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

async function runFetchAgentExample() {
    try {
        logger.info('Running FetchAgent example');

        // Create cache directory if it doesn't exist
        const cacheDir = path.join(process.cwd(), 'cache', 'mitre-attack');
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }

        // Create and configure FetchAgent
        const fetchAgent = new FetchAgent({
            sourceUrl: 'https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json',
            backupSourceUrl: 'https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json',
            cacheDir: cacheDir,
            updateInterval: 24 * 60 * 60 * 1000, // 24 hours
            maxRetries: 3,
            requestTimeout: 60000 // 60 seconds
        });

        // Initialize the agent
        await fetchAgent.initialize();

        // Fetch MITRE ATT&CK data
        logger.info('Fetching MITRE ATT&CK data...');
        const result = await fetchAgent.fetch();

        logger.info(`Successfully fetched MITRE ATT&CK data version ${result.version}`);
        logger.info(`Change detected: ${result.changeDetected}`);
        logger.info(`Source: ${result.source}`);
        logger.info(`Timestamp: ${result.timestamp}`);

        // Get the number of techniques
        let techniqueCount = 0;
        if (result.mitreData && Array.isArray(result.mitreData.objects)) {
            techniqueCount = result.mitreData.objects.filter(
                (obj: any) => obj.type === 'attack-pattern'
            ).length;
        }

        logger.info(`Number of techniques: ${techniqueCount}`);

        // Schedule updates
        fetchAgent.scheduleUpdates();
        logger.info('Scheduled automatic updates');

        // Wait a bit and then stop updates
        logger.info('Waiting for 5 seconds before stopping...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        fetchAgent.stopScheduledUpdates();
        logger.info('Stopped automatic updates');

        logger.info('FetchAgent example completed successfully');
    } catch (error: any) {
        logger.error(`Error in FetchAgent example: ${error.message}`);
        process.exit(1);
    }
}

// Run the example
if (require.main === module) {
    runFetchAgentExample();
}
