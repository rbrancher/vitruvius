import { describe, it, expect } from 'vitest';
import {
  getMagazines, getEditionsByMagazine, getPublishedArticlesByEdition, getArticleImages,
  getArticlePages, getArticleAbstracts, getEditionCoverImages, getLatestEditions,
  getAuthorsWithArticles, getAllPublishedArticles, authorFullName,
} from '../../src/lib/db';

// Runs against the sample database (db/fixture.sql).

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
    expect(getPublishedArticlesByEdition(11).map(a => a.id)).toEqual([101, 102]);
  });

  it('joins author and Portuguese abstract onto articles', () => {
    const [a] = getPublishedArticlesByEdition(11);
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
    const covers = getEditionCoverImages(30);
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
});
