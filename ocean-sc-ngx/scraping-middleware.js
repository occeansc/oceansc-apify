// scraping-middleware.js
import UserAgent from 'user-agents'; // Correct import
import NodeCache from 'node-cache';

const userAgentCache = new NodeCache({ stdTTL: 3600 });

export const politeScraping = {
    getRandomUserAgent: () => {
        let userAgent = userAgentCache.get('user-agent');
        if (!userAgent) {
            const userAgentInstance = new UserAgent();  // Create instance
            userAgent = userAgentInstance.toString(); // Use toString()
            userAgentCache.set('user-agent', userAgent);
        }
        return userAgent;
    },

    getRandomDelay: (minDelay = 5000, maxDelay = 15000) => {
        return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    },
};