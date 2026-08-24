import { config } from "dotenv";

config();

async function main() {
  const { startAutomationScheduler } = await import("../lib/jobs/worker");
  await startAutomationScheduler();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
