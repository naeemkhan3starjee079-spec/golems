import { notFound } from "next/navigation";
import { getAllDocSlugs, getDoc, getDocsNav, renderMarkdown } from "@/lib/docs";
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

  const html = await renderMarkdown(doc.content);
  const nav = getDocsNav();

  return <DocsClient html={html} title={doc.title} nav={nav} currentSlug={slug.join("/")} />;
}
