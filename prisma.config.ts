import { defineConfig } from "@prisma/config";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("❌ DATABASE_URL is missing from .env file or not loaded!");
}

export default defineConfig({
  datasource: {
    url: url,
  },
});