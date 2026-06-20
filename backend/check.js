const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const file = await prisma.file.findUnique({ where: { id: "04b7c3fe-ab6c-4026-90ff-514dd2b103ba" } });
  const folder = await prisma.folder.findUnique({ where: { id: "04b7c3fe-ab6c-4026-90ff-514dd2b103ba" } });
  console.log("File:", !!file, "Folder:", !!folder);
}
run();
