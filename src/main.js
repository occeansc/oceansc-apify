const Apify = require('apify'); // This line is absolutely essential!

Apify.main(async () => {
    console.log("Hello from OceanSc!");
    await Apify.setValue('TEST', { message: 'Hello!' });
    console.log("Test value set.");
});
