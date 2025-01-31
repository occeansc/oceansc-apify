const Apify = require('apify');

Apify.main(async () => {
    console.log("Hello from OceanSc!");
    await Apify.setValue('TEST', { message: 'Hello!' }); // Add a test value
    console.log("Test value set.");
});
