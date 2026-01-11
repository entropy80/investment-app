#!/usr/bin/env node
/**
 * Reusable Article Seed Script
 *
 * Seeds articles from MDX files with frontmatter into the database.
 *
 * Usage:
 *   node scripts/seed-article.mjs <path-to-mdx-file>
 *   node scripts/seed-article.mjs articles/my-article.mdx
 *   node scripts/seed-article.mjs articles/*.mdx  # Seed all articles
 *
 * MDX File Format:
 *   ---
 *   title: "Article Title"
 *   slug: "article-url-slug"  # Optional, auto-generated from title if not provided
 *   excerpt: "Brief description for cards and SEO"
 *   category: "INVESTING_GUIDE"  # BROKER_REVIEW, INVESTING_GUIDE, BASICS, MARKET_ANALYSIS, PORTFOLIO_STRATEGY, NEWS
 *   tags: ["tag1", "tag2"]
 *   tier: "FREE"  # FREE or AUTHENTICATED
 *   featured: false
 *   coverImage: "https://..."  # Optional
 *   author: "admin@localhost"  # Optional, defaults to admin@localhost
 *   ---
 *
 *   Article content in Markdown/MDX...
 */

import { readFileSync, existsSync } from "fs";
import { basename } from "path";
import { PrismaClient } from "@prisma/client";

// Load .env.local manually
const envFile = readFileSync(".env.local", "utf8");
for (const line of envFile.split("\n")) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").replace(/^["']|["']$/g, "");
    process.env[key] = value;
  }
}

const prisma = new PrismaClient();

// Valid categories from Prisma schema
const VALID_CATEGORIES = [
  "BROKER_REVIEW",
  "INVESTING_GUIDE",
  "BASICS",
  "MARKET_ANALYSIS",
  "PORTFOLIO_STRATEGY",
  "NEWS"
];

// Valid tiers
const VALID_TIERS = ["FREE", "AUTHENTICATED"];

/**
 * Parse frontmatter from MDX content
 */
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    throw new Error("Invalid MDX file: No frontmatter found. File must start with ---");
  }

  const [, frontmatterStr, body] = match;
  const frontmatter = {};

  // Parse YAML-like frontmatter
  let currentKey = null;
  let inArray = false;
  let arrayValues = [];

  for (const line of frontmatterStr.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for array item
    if (inArray && trimmed.startsWith("-")) {
      const value = trimmed.slice(1).trim().replace(/^["']|["']$/g, "");
      arrayValues.push(value);
      continue;
    } else if (inArray) {
      // End of array
      frontmatter[currentKey] = arrayValues;
      inArray = false;
      arrayValues = [];
    }

    // Check for key-value pair
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex > 0) {
      const key = trimmed.slice(0, colonIndex).trim();
      let value = trimmed.slice(colonIndex + 1).trim();

      // Check if it's an inline array like ["tag1", "tag2"]
      if (value.startsWith("[") && value.endsWith("]")) {
        const arrayContent = value.slice(1, -1);
        frontmatter[key] = arrayContent
          .split(",")
          .map(v => v.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
      }
      // Check if it's the start of a multi-line array
      else if (value === "" || value === "[]") {
        currentKey = key;
        inArray = true;
        arrayValues = [];
      }
      // Boolean values
      else if (value === "true") {
        frontmatter[key] = true;
      } else if (value === "false") {
        frontmatter[key] = false;
      }
      // String values (remove quotes if present)
      else {
        frontmatter[key] = value.replace(/^["']|["']$/g, "");
      }
    }
  }

  // Handle trailing array
  if (inArray && currentKey) {
    frontmatter[currentKey] = arrayValues;
  }

  return { frontmatter, content: body.trim() };
}

/**
 * Generate URL slug from title
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Estimate read time in minutes
 */
function estimateReadTime(content) {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Validate frontmatter
 */
function validateFrontmatter(frontmatter, filename) {
  const errors = [];

  if (!frontmatter.title) {
    errors.push("Missing required field: title");
  }

  if (!frontmatter.excerpt) {
    errors.push("Missing required field: excerpt");
  }

  if (!frontmatter.category) {
    errors.push("Missing required field: category");
  } else if (!VALID_CATEGORIES.includes(frontmatter.category)) {
    errors.push(`Invalid category: ${frontmatter.category}. Must be one of: ${VALID_CATEGORIES.join(", ")}`);
  }

  if (frontmatter.tier && !VALID_TIERS.includes(frontmatter.tier)) {
    errors.push(`Invalid tier: ${frontmatter.tier}. Must be one of: ${VALID_TIERS.join(", ")}`);
  }

  if (errors.length > 0) {
    throw new Error(`Validation errors in ${filename}:\n  - ${errors.join("\n  - ")}`);
  }
}

/**
 * Seed a single article from MDX file
 */
async function seedArticle(filePath) {
  const filename = basename(filePath);
  console.log(`\nProcessing: ${filename}`);

  // Read file
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileContent = readFileSync(filePath, "utf8");
  const { frontmatter, content } = parseFrontmatter(fileContent);

  // Validate
  validateFrontmatter(frontmatter, filename);

  // Get or create author
  const authorEmail = frontmatter.author || "admin@localhost";
  let author = await prisma.user.findUnique({
    where: { email: authorEmail },
  });

  if (!author) {
    console.log(`  Creating author: ${authorEmail}`);
    author = await prisma.user.create({
      data: {
        email: authorEmail,
        name: authorEmail.split("@")[0],
        role: "ADMIN",
      },
    });
  }

  // Prepare article data
  const slug = frontmatter.slug || generateSlug(frontmatter.title);
  const readTime = frontmatter.readTime || estimateReadTime(content);

  const articleData = {
    title: frontmatter.title,
    slug,
    excerpt: frontmatter.excerpt,
    content,
    category: frontmatter.category,
    tags: frontmatter.tags || [],
    requiredTier: frontmatter.tier || "FREE",
    published: frontmatter.published !== false, // Default to true
    featured: frontmatter.featured || false,
    coverImage: frontmatter.coverImage || null,
    readTime,
    publishedAt: new Date(),
    authorId: author.id,
  };

  // Check if article exists
  const existingArticle = await prisma.article.findUnique({
    where: { slug },
  });

  if (existingArticle) {
    console.log(`  Updating existing article: ${slug}`);
    await prisma.article.update({
      where: { id: existingArticle.id },
      data: {
        ...articleData,
        authorId: undefined, // Don't update author
      },
    });
    console.log(`  Updated!`);
  } else {
    console.log(`  Creating new article: ${slug}`);
    await prisma.article.create({
      data: articleData,
    });
    console.log(`  Created!`);
  }

  console.log(`  URL: /articles/${slug}`);
  console.log(`  Category: ${frontmatter.category}`);
  console.log(`  Tier: ${frontmatter.tier || "FREE"}`);
  console.log(`  Read time: ${readTime} min`);

  return slug;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Article Seed Script
==================

Usage:
  node scripts/seed-article.mjs <path-to-mdx-file>
  node scripts/seed-article.mjs articles/my-article.mdx

MDX File Format:
  ---
  title: "Article Title"
  slug: "article-url-slug"
  excerpt: "Brief description"
  category: "INVESTING_GUIDE"
  tags: ["tag1", "tag2"]
  tier: "FREE"
  featured: false
  ---

  Article content...

Valid Categories:
  ${VALID_CATEGORIES.join(", ")}

Valid Tiers:
  ${VALID_TIERS.join(", ")}
`);
    process.exit(0);
  }

  console.log("Article Seed Script");
  console.log("===================");

  const seededSlugs = [];

  for (const filePath of args) {
    try {
      const slug = await seedArticle(filePath);
      seededSlugs.push(slug);
    } catch (error) {
      console.error(`\nError processing ${filePath}:`);
      console.error(`  ${error.message}`);
      process.exit(1);
    }
  }

  console.log("\n===================");
  console.log(`Successfully seeded ${seededSlugs.length} article(s):`);
  for (const slug of seededSlugs) {
    console.log(`  - /articles/${slug}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
