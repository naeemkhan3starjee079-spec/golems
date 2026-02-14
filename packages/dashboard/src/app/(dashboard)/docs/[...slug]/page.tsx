import { notFound } from "next/navigation";
import { getAllDocSlugs, getDoc, getDocsNav, flattenNav, renderMarkdown } from "@/lib/docs";
import { DocsClient } from "./docs-client";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllDocSlugs().map((slug) => ({ slug }));
}

type Props = {
  params: Promise<{ slug: string[] }>;
};

export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();

  const { html, toc } = await renderMarkdown(doc.content);
  const nav = getDocsNav();
  const currentSlug = slug.join("/");

  // Compute prev/next
  const flat = flattenNav(nav);
  const idx = flat.findIndex((p) => p.slug === currentSlug);
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx < flat.length - 1 ? flat[idx + 1] : null;

  return (
    <DocsClient
      html={html}
      title={doc.title}
      nav={nav}
      currentSlug={currentSlug}
      toc={toc}
      prev={prev}
      next={next}
    />
  );
}
