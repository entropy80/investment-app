import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const docId = process.argv[2];
  if (!docId) {
    console.error('Usage: node fetch-doc.mjs <document-id>');
    process.exit(1);
  }

  const doc = await prisma.document.findUnique({
    where: { id: docId }
  });

  if (!doc) {
    console.error('Document not found');
    process.exit(1);
  }

  console.log('Document: ' + doc.name);
  console.log('URL: ' + doc.storageUrl);
  console.log('\nFetching content...\n');

  const response = await fetch(doc.storageUrl);
  const content = await response.text();
  console.log(content);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
