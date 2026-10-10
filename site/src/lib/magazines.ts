// The seven magazines. `id` fixes their order across the site.
export const MAGAZINES = [
  { id: 1, slug: 'arquitextos',    label: 'arquitextos',     issn: '1809-6298', color: '#CC0000' },
  { id: 2, slug: 'arquiteturismo', label: 'arquiteturismo',  issn: '1982-9930', color: '#F89820' },
  { id: 3, slug: 'drops',          label: 'drops',           issn: '2175-6716', color: '#1C3664' },
  { id: 4, slug: 'minhacidade',    label: 'minha cidade',    issn: '1982-9922', color: '#000000' },
  { id: 5, slug: 'entrevista',     label: 'entrevista',      issn: '2175-6708', color: '#0598CD' },
  { id: 6, slug: 'projetos',       label: 'projetos',        issn: '2595-4245', color: '#673466' },
  { id: 7, slug: 'resenhasonline', label: 'resenhas online', issn: '2175-6694', color: '#009245' },
] as const;
