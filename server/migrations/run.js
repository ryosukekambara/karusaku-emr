const runMigration = require('./add_deleted_at');
runMigration().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
