import 'dotenv/config'; 
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Note: This seed file is for reference only.
  // If you need to seed data, first create a user, then create companions with that userId.

  console.log("Seed file updated. Companions now require a userId.");
  console.log("Please register a user through the app, then create companions via the UI.");

  // Example of how to seed if you have a specific user:
  // const user = await prisma.user.create({
  //   data: {
  //     email: "demo@example.com",
  //     username: "demo",
  //     name: "Demo User",
  //     hashedPassword: await bcrypt.hash("password123", 10)
  //   }
  // });
  //
  // const lumen = await prisma.companion.create({
  //   data: {
  //     userId: user.id,
  //     name: "Lumen",
  //     description: "...",
  //     visualDescription: "...",
  //     currentOutfit: "...",
  //     userAppearance: "..."
  //   }
  // });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end(); 
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });