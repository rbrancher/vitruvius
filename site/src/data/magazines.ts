export interface MagazineMeta {
  slug: string;
  name: string;
  description: string;
  issn?: string;
  frequency: string;
  color: string; // accent color for visual differentiation
}

export const magazines: MagazineMeta[] = [
  {
    slug: 'arquitextos',
    name: 'Arquitextos',
    description:
      'Periódico acadêmico e crítico sobre arquitetura, urbanismo, paisagismo e cultura. Artigos de fundo, ensaios e análises de longa duração.',
    issn: '1809-6298',
    frequency: 'Mensal',
    color: '#8B0000',
  },
  {
    slug: 'arquiteturismo',
    name: 'Arquiteturismo',
    description:
      'A relação entre arquitetura e turismo — cidades, monumentos, roteiros e o patrimônio construído como destino.',
    frequency: 'Mensal',
    color: '#2E5D4B',
  },
  {
    slug: 'drops',
    name: 'Drops',
    description:
      'Notas breves sobre eventos, exposições, concursos e notícias do mundo da arquitetura e do urbanismo.',
    frequency: 'Contínuo',
    color: '#1A3A5C',
  },
  {
    slug: 'minha-cidade',
    name: 'Minha Cidade',
    description:
      'Fórum de debate sobre questões urbanas. Ensaios, relatos e reflexões sobre a cidade contemporânea brasileira.',
    frequency: 'Contínuo',
    color: '#5C3D1A',
  },
  {
    slug: 'entrevista',
    name: 'Entrevista',
    description:
      'Conversas com arquitetos, urbanistas, críticos e pesquisadores que moldam o pensamento arquitetônico contemporâneo.',
    frequency: 'Contínuo',
    color: '#3D1A5C',
  },
  {
    slug: 'resenhasonline',
    name: 'Resenhas Online',
    description:
      'Crítica de livros de arquitetura, arte, urbanismo e cultura. Um espaço para o debate editorial.',
    frequency: 'Contínuo',
    color: '#1A4A5C',
  },
  {
    slug: 'projetos',
    name: 'Projetos',
    description:
      'Apresentação e análise de projetos de arquitetura e urbanismo contemporâneos, brasileiros e internacionais.',
    frequency: 'Contínuo',
    color: '#4A4A1A',
  },
];

export function getMagazine(slug: string): MagazineMeta | undefined {
  return magazines.find((m) => m.slug === slug);
}
