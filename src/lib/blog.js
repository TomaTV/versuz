/**
 * Blog content registry.
 *
 * Posts live as Server Components in src/app/blog/posts/<slug>.js, exporting
 * `metadata` (title, excerpt, dateISO, tags, author) and `Body` (the
 * React component for the post body). This file is the single source of
 * truth — adding a new post = 1 new file + 1 import here.
 *
 * Why not MDX : we don't need full Markdown semantics, and avoiding the
 * @mdx-js dep keeps the install thin. Each post is its own RSC, which
 * means embedded React components (CommandBlock, callouts, etc.) just
 * work without MDX plumbing.
 */

import * as lessonsIndexing17k from "@/app/blog/posts/lessons-from-indexing-1700-skills";
import * as buildingACli from "@/app/blog/posts/building-a-cli-nobody-asked-for";
import * as antiSpamSolo from "@/app/blog/posts/anti-spam-for-a-solo-marketplace";

const POSTS = [
  {
    slug: "lessons-from-indexing-1700-skills",
    ...lessonsIndexing17k.metadata,
    Body: lessonsIndexing17k.Body,
  },
  {
    slug: "building-a-cli-nobody-asked-for",
    ...buildingACli.metadata,
    Body: buildingACli.Body,
  },
  {
    slug: "anti-spam-for-a-solo-marketplace",
    ...antiSpamSolo.metadata,
    Body: antiSpamSolo.Body,
  },
];

export function getAllPosts() {
  return [...POSTS].sort(
    (a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
  );
}

export function getPostBySlug(slug) {
  return POSTS.find((p) => p.slug === slug) || null;
}

export function getPostSlugs() {
  return POSTS.map((p) => p.slug);
}
