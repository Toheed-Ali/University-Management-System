const { createApp } = require('./src/app');
const { connectToDatabase } = require('./src/db');
const { config } = require('./src/config');

async function main() {
  try {
    // Connect to MySQL
    await connectToDatabase();
    console.log('✅ Connected to MySQL database');

    // Create Express app
    const app = createApp();

    // Start server
    app.listen(config.port, config.host, () => {
      console.log(`\n🚀 API running on http://${config.host}:${config.port}`);
      console.log(`   Health: GET /api/v1/health`);
      console.log(`   Auth: POST /api/v1/auth/login`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

main();
