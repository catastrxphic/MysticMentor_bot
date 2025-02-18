import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";
import * as schema from "./schema";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DB_URI,
  ssl: {rejectUnauthorized: false },
});

export const db = drizzle(pool);
