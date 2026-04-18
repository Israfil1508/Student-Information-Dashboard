import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveDataFilePath } from "./db.js";
import { buildSeedDatabase } from "./seedData.js";

const run = async (): Promise<void> => {
  const database = buildSeedDatabase();
  const filePath = resolveDataFilePath();
  const directory = path.dirname(filePath);

  await mkdir(directory, { recursive: true });
  await writeFile(filePath, JSON.stringify(database, null, 2), "utf8");

  console.log(`Seeded database at ${filePath}`);
  console.log(`Students: ${database.students.length}`);
  console.log(`Mentors: ${database.mentors.length}`);
  console.log(`Scholarships: ${database.scholarships.length}`);
  console.log(`Meetings: ${database.meetings.length}`);
};

run().catch((error) => {
  console.error("Failed to seed database", error);
  process.exit(1);
});
