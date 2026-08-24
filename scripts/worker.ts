import { config } from "dotenv";

config();

async function main() {
  const { startAutomationWorker } = await import("../lib/jobs/worker");
  await startAutomationWorker({ includeScheduler: true });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
