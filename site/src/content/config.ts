import { defineCollection, z } from 'astro:content';

const imageSchema = z.object({
  src:     z.string(), // full-size URL or path
  thumb:   z.string(), // thumbnail URL or path
  caption: z.string().default(''),
});

const authorSchema = z.object({
  name:        z.string(),
  institution: z.string().optional(),
});

const articleSchema = z.object({
  // Numeric article ID from the legacy system — used in URL and for migration mapping
  legacyId:    z.number(),
  title:       z.string(),
  subtitle:    z.string().optional(),
  // Issue identifier in the format "{year}.{number}", e.g. "01.001", "18.211"
  issue:       z.string(),
  authors:     z.array(authorSchema),
  abstract:    z.string().optional(),
  tags:        z.array(z.string()).default([]),
  publishedAt: z.coerce.date(),
  images:      z.array(imageSchema).default([]),
  coverImage:  z.string().optional(),
  pdfUrl:      z.string().optional(),
});

export const collections = {
  arquitextos:    defineCollection({ type: 'content', schema: articleSchema }),
  arquiteturismo: defineCollection({ type: 'content', schema: articleSchema }),
  drops:          defineCollection({ type: 'content', schema: articleSchema }),
  'minha-cidade': defineCollection({ type: 'content', schema: articleSchema }),
  entrevista:     defineCollection({ type: 'content', schema: articleSchema }),
  resenhasonline: defineCollection({ type: 'content', schema: articleSchema }),
  projetos:       defineCollection({ type: 'content', schema: articleSchema }),
};
