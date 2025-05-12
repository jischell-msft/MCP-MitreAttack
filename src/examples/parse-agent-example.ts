import { FetchAgent } from '../agents/fetch';
import { ParseAgent } from '../agents/parse';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

async function runParseAgentExample() {
    try {
        logger.info('Running ParseAgent example');

        // Create cache directory if it doesn't exist
        const cacheDir = path.join(process.cwd(), 'cache', 'mitre-attack');
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }

        // Step 1: Use FetchAgent to get MITRE ATT&CK data
        const fetchAgent = new FetchAgent({
            sourceUrl: 'https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json',
            cacheDir: cacheDir,
            updateInterval: 24 * 60 * 60 * 1000, // 24 hours
            maxRetries: 3,
            requestTimeout: 60000 // 60 seconds
        });

        await fetchAgent.initialize();
        logger.info('Fetching MITRE ATT&CK data...');

        const fetchResult = await fetchAgent.fetch();
        logger.info(`Successfully fetched MITRE ATT&CK data version ${fetchResult.version}`);

        // Step 2: Use ParseAgent to process the data
        const parseAgent = new ParseAgent({
            includeSubtechniques: true,
            includeTactics: true,
            includeDataSources: true,
            extractKeywords: true
        });

        await parseAgent.initialize();
        logger.info('Parsing MITRE ATT&CK data...');

        const parseResult = await parseAgent.parse(fetchResult.mitreData);

        // Print some statistics about the parsed data
        logger.info(`Successfully parsed MITRE data version: ${parseResult.version}`);
        logger.info(`Total techniques: ${parseResult.techniques.length}`);
        logger.info(`Total tactics: ${parseResult.tacticMap.size}`);

        // Show some example techniques
        logger.info('Example techniques:');
        const exampleTechniques = parseResult.techniques.slice(0, 3);
        exampleTechniques.forEach(technique => {
            logger.info(`- ${technique.id}: ${technique.name}`);
            logger.info(`  Tactics: ${technique.tactics.join(', ')}`);
            logger.info(`  Keywords: ${technique.keywords.slice(0, 5).join(', ')}...`);
        });

        // Try some searches
        const searchTerms = ['phishing', 'credential', 'ransomware'];
        for (const term of searchTerms) {
            const results = parseAgent.searchTechniques(term);
            logger.info(`Search for "${term}" returned ${results.length} results`);
            if (results.length > 0) {
                logger.info(`Top result: ${results[0].id} - ${results[0].name}`);
            }
        }

        // Try some filtering
        const filtered = parseAgent.filterTechniques({
            tactics: ['initial-access'],
            platforms: ['Windows']
        });
        logger.info(`Filtering for Initial Access + Windows: ${filtered.length} results`);

        logger.info('ParseAgent example completed successfully');
    } catch (error: any) {
        logger.error(`Error in ParseAgent example: ${error.message}`);
        process.exit(1);
    }
}

// Run the example
if (require.main === module) {
    runParseAgentExample();
}
