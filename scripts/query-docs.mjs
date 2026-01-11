import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const portfolioId = process.argv[2];
  if (!portfolioId) {
    console.error('Usage: node query-docs.mjs <portfolio-id>');
    process.exit(1);
  }

  const documents = await prisma.document.findMany({
    where: {
      portfolioId
    },
    orderBy: { uploadedAt: 'desc' },
    select: {
      id: true,
      name: true,
      displayName: true,
      category: true,
      mimeType: true,
      size: true,
      year: true,
      uploadedAt: true,
      storageUrl: true
    }
  });

  console.log('Found ' + documents.length + ' documents:\n');
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    console.log((i + 1) + '. ' + (doc.displayName || doc.name));
    console.log('   Category: ' + doc.category);
    console.log('   Type: ' + doc.mimeType);
    console.log('   Size: ' + (doc.size / 1024).toFixed(1) + ' KB');
    console.log('   Year: ' + (doc.year || '-'));
    console.log('   Uploaded: ' + doc.uploadedAt.toISOString());
    console.log('   ID: ' + doc.id);
    console.log('');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
