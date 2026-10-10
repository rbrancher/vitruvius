import { describe, it, expect } from 'vitest';
import {
  getMagazines, getEditionsByMagazine, getPublishedArticlesByEdition, getArticleImages,
  getArticlePages, getArticleAbstracts, getEditionCoverImages, getLatestEditions,
  getAuthorsWithArticles, getAllPublishedArticles, authorFullName, getEditionByIdx, getArticleWithMeta,
} from '../../src/lib/content';

// Runs against the sample content (tests/fixture/conteudo).

const edition = (magazineId: number, idx: string) => getEditionByIdx(magazineId, idx)!.id;

describe('queries', () => {
  it('lists the seven magazines', () => {
    expect(getMagazines().map(m => m.title)).toEqual([
      'arquitextos', 'arquiteturismo', 'drops', 'minhacidade', 'entrevista', 'projetos', 'resenhasonline',
    ]);
  });

  it('hides unpublished editions and orders newest first', () => {
    expect(getEditionsByMagazine(1).map(e => e.idx)).toEqual(['24.286', '24.285']);
  });

  it('hides draft articles and orders by index', () => {
    expect(getPublishedArticlesByEdition(edition(1, '24.286')).map(a => a.id)).toEqual([101, 102]);
  });

  it('joins author and Portuguese abstract onto articles', () => {
    const [a] = getPublishedArticlesByEdition(edition(1, '24.286'));
    expect(a.author_slug).toBe('ana-exemplo');
    expect(a.abstract).toBe('Resumo em português do artigo sobre concreto.');
    expect(a.magazine_title).toBe('arquitextos');
  });

  it('returns images in order with Portuguese captions', () => {
    const imgs = getArticleImages(101);
    expect(imgs.map(i => i.id)).toEqual([1001, 1002]);
    expect(imgs[0].caption).toContain('<em>Copan</em>');
  });

  it('skips empty abstracts and labels languages', () => {
    expect(getArticleAbstracts(101).map(a => a.label)).toEqual(['português', 'english']);
  });

  it('returns projetos pages in order', () => {
    expect(getArticlePages(601).map(p => p.title)).toEqual(['Implantação', 'Detalhes']);
  });

  it('maps articles to their cover image', () => {
    const covers = getEditionCoverImages(edition(3, '23.140'));
    expect(covers.size).toBe(4);
    expect(covers.has(305)).toBe(false);
  });

  it('returns the latest edition of each magazine', () => {
    const latest = getLatestEditions();
    expect(latest).toHaveLength(7);
    expect(latest.find(e => e.magazine_title === 'arquitextos')?.idx).toBe('24.286');
  });

  it('only lists authors with published articles', () => {
    expect(getAuthorsWithArticles().map(a => a.slug).sort())
      .toEqual(['ana-exemplo', 'bruno-teste', 'carla-amostra', 'daniel-fixture']);
    expect(getAllPublishedArticles().some(a => a.status === '1')).toBe(false);
  });

  it('formats author names', () => {
    expect(authorFullName({ firstname: 'Ana', lastname: null })).toBe('Ana');
    expect(authorFullName({ firstname: 'Ana', lastname: 'Exemplo' })).toBe('Ana Exemplo');
  });

  it('renders Markdown articles and their captions', () => {
    const a = getArticleWithMeta(105)!;
    expect(a.text).toContain('<strong>negrito</strong>');
    expect(a.text).toContain('<blockquote>');
    expect(a.created_at).toBe(Date.UTC(2024, 1, 1, 12) / 1000);
    expect(getArticleImages(105)[0]).toMatchObject({ src: '/imagens/2024/exemplo.jpg', is_cover: 1, caption: 'Edifício <em>Copan</em>, São Paulo' });
  });

  it('keeps legacy HTML articles as they are', () => {
    expect(getArticleWithMeta(101)!.text).toContain('{--image:1001--}');
  });
});
