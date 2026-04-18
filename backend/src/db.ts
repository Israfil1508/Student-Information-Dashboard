import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildSeedDatabase } from "./seedData.js";
import type { Database } from "./types.js";

const defaultDataFile = path.resolve(process.cwd(), "data", "db.json");

export const resolveDataFilePath = (): string => {
  const envPath = process.env.DATA_FILE?.trim();
  if (!envPath) {
    return defaultDataFile;
  }

  if (path.isAbsolute(envPath)) {
    return envPath;
  }

  return path.resolve(process.cwd(), envPath);
};

const ensureDataFile = async (filePath: string): Promise<void> => {
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true });

  try {
    await readFile(filePath, "utf8");
  } catch {
    const seed = buildSeedDatabase();
    await writeFile(filePath, JSON.stringify(seed, null, 2), "utf8");
  }
};

export const initializeDatabase = async (): Promise<void> => {
  const filePath = resolveDataFilePath();
  await ensureDataFile(filePath);
};

export const readDatabase = async (): Promise<Database> => {
  const filePath = resolveDataFilePath();
  await ensureDataFile(filePath);
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as Database;
};

export const writeDatabase = async (database: Database): Promise<void> => {
  const filePath = resolveDataFilePath();
  await ensureDataFile(filePath);
  await writeFile(filePath, JSON.stringify(database, null, 2), "utf8");
};
