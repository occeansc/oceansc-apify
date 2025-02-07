// error-handler.js
import winston from 'winston';

// Configure Winston logger (or any other logging mechanism you prefer)
const logger = winston.createLogger({
    // ... your Winston configuration ...
});

export const errorHandler = {
    handleError: (error, context = {}) => {
        const errorMessage = error.message || "An unknown error occurred.";
        logger.error(errorMessage, context); // Log the error

        // You might want to do other things here, like:
        // - Display a user-friendly message
        // - Exit the application (if necessary)
        // - Send an error report to a service
    },

    withRetry: async (fn, retryOptions = {}) => {
      const { retries = 3, factor = 2, minTimeout = 1000, maxTimeout = 60000, onFailedAttempt } = retryOptions;
      let currentAttempt = 0;

      while (currentAttempt < retries) {
        try {
          return await fn();
        } catch (error) {
          currentAttempt++;
          if (currentAttempt < retries) {
            const timeout = Math.min(maxTimeout, minTimeout * Math.pow(factor, currentAttempt));
            console.warn(`Attempt ${currentAttempt} failed. Retrying in ${timeout / 1000} seconds...`);
            if (onFailedAttempt) {
              await onFailedAttempt(error);
            }
            await new Promise(resolve => setTimeout(resolve, timeout));
          } else {
            throw error; // Re-throw the error after all retries fail
          }
        }
      }
    },

    log: logger, // Expose the logger
};