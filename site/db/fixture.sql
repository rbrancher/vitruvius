-- Small sample dataset used by tests, CI and cloud sessions instead of the
-- real vitruvius.db (which is not in git). Loaded on top of db/schema.sql by
-- scripts/build-fixture-db.mjs.
--
-- It deliberately includes the awkward cases the real data has: HTML in
-- captions, CMS <span> noise, PHP-escaped quotes, {--image:ID--} placeholders,
-- multi-page projetos articles, drops sections, drafts that must stay hidden.
-- Timestamps are fixed so screenshots are stable.

INSERT INTO magazines (id, title, issn, status) VALUES
  (1, 'arquitextos',    '1809-6298', '1'),
  (2, 'arquiteturismo', '1982-9930', '1'),
  (3, 'drops',          '2175-6716', '1'),
  (4, 'minhacidade',    '1982-9922', '1'),
  (5, 'entrevista',     '2175-6708', '1'),
  (6, 'projetos',       '2595-4245', '1'),
  (7, 'resenhasonline', '2175-6694', '1');

-- status '1'/'2' = published, '0' = hidden
INSERT INTO editions (id, magazine_id, idx, published_at, status) VALUES
  (10, 1, '24.285', 1706745600, '2'),  -- 2024-02-01
  (11, 1, '24.286', 1709251200, '2'),  -- 2024-03-01
  (12, 1, '24.287', 1711929600, '0'),  -- hidden, must not render
  (20, 2, '18.205', 1514764800, '2'),
  (30, 3, '23.140', 1672531200, '2'),
  (40, 4, '22.264', 1648771200, '2'),
  (50, 5, '21.083', 1625097600, '2'),
  (60, 6, '20.230', 1585699200, '2'),
  (70, 7, '19.216', 1559347200, '2');

INSERT INTO authors (id, firstname, lastname, institution, biography, degree, email, slug) VALUES
  (1, 'Ana',     'Exemplo',  'Universidade Fictícia', '<p>Arquiteta e urbanista, professora de <em>teoria da arquitetura</em>.</p>', 'Doutora', 'ana@example.com', 'ana-exemplo'),
  (2, 'Bruno',   'Teste',    'Instituto Modelo',      'Arquiteto.', NULL, NULL, 'bruno-teste'),
  (3, 'Carla',   'Amostra',  NULL,                    NULL, NULL, NULL, 'carla-amostra'),
  (4, 'Daniel',  'Fixture',  'Escola de Arquitetura', 'Fotógrafo e arquiteto.', 'Mestre', NULL, 'daniel-fixture');

-- status '2'/'3' = published, '1' = draft
INSERT INTO articles (id, magazine_id, edition_id, author_id, idx, title, subtitle, lead, text, status, section, created_at, published_at) VALUES
  (101, 1, 11, 1, '01', 'A cidade e o <em>concreto</em>', 'Notas sobre a arquitetura paulista', 'Um ensaio sobre forma e matéria.',
   '<p>Primeiro parágrafo do artigo, com uma \"citação escapada\" vinda do PHP.</p>
<p>{--image:1001--}</p>
<p><span class="text">Texto envolvido em span do CMS.</span></p>
<span class="text citation">Uma citação longa que deve virar blockquote.</span>
<p>Veja a <a href="../../revistas/read/arquitextos/24.286/101?page=2">página dois</a>.</p>
<p>{--image:1002--}</p>
<p></p><p></p><p></p>
<p>Último parágrafo.</p>', '2', NULL, 1709251200, NULL),
  (102, 1, 11, 2, '02', 'Habitação social em debate', NULL, NULL, '<p>Texto curto.</p>', '2', NULL, 1709251200, NULL),
  (103, 1, 11, 3, '03', 'Rascunho que não deve aparecer', NULL, NULL, '<p>Draft.</p>', '1', NULL, 1709251200, NULL),
  (104, 1, 10, 1, '01', 'Modernismo revisitado', 'Um subtítulo', NULL, '<p>Artigo da edição anterior.</p>', '2', NULL, 1706745600, NULL),
  (201, 2, 20, 4, '01', 'Viagem a Brasília', NULL, NULL, '<p>Relato de viagem.</p><p>{--image:2001--}</p>', '2', NULL, 1514764800, NULL),
  (202, 2, 20, 2, '02', 'Lisboa a pé', NULL, NULL, '<p>Outro relato.</p>', '2', NULL, 1514764800, NULL),
  (301, 3, 30, 1, '01', 'Drops um',    NULL, NULL, '<p>Drop 1.</p>', '2', 'ensaio',   1672531200, NULL),
  (302, 3, 30, 2, '02', 'Drops dois',  NULL, NULL, '<p>Drop 2.</p>', '2', 'crônica',  1672531200, NULL),
  (303, 3, 30, 3, '03', 'Drops três com um título bem mais longo que os outros', NULL, NULL, '<p>Drop 3.</p>', '2', NULL, 1672531200, NULL),
  (304, 3, 30, 4, '04', 'Drops quatro', NULL, NULL, '<p>Drop 4.</p>', '2', 'ensaio',  1672531200, NULL),
  (305, 3, 30, NULL, '05', 'Drops cinco sem autor nem capa', NULL, NULL, '<p>Drop 5.</p>', '2', NULL, 1672531200, NULL),
  (401, 4, 40, 3, '01', 'O bairro e a praça', NULL, NULL, '<p>Minha cidade.</p>', '2', NULL, 1648771200, NULL),
  (501, 5, 50, 1, '01', 'Entrevista com uma arquiteta', NULL, NULL, '<p><strong>Pergunta:</strong> resposta.</p>', '2', NULL, 1625097600, NULL),
  (601, 6, 60, 4, '01', 'Casa no litoral', 'Projeto residencial', NULL, '<p>Página um do projeto.</p><p>{--image:6001--}</p>', '2', NULL, 1585699200, NULL),
  (701, 7, 70, 2, '01', 'Resenha: <em>Arquitetura e cidade</em>', NULL, NULL, '<p>Resenha do livro.</p>', '2', NULL, 1559347200, NULL);

INSERT INTO articleabstracts (id, article_id, language_id, abstract) VALUES
  (1, 101, 1, 'Resumo em português do artigo sobre concreto.'),
  (2, 101, 2, 'English abstract of the concrete article.'),
  (3, 101, 3, ''),
  (4, 201, 1, 'Resumo da viagem.');

-- projetos pages: rendered as /revistas/read/projetos/20.230/601/2 and /3
INSERT INTO articlepages (id, article_id, pagenum, title, location, date, text) VALUES
  (1, 601, 1, 'Implantação', 'Ubatuba SP', '2019', '<p>Texto da página dois.</p><p>{--image:6002--}</p>'),
  (2, 601, 2, 'Detalhes',    'Ubatuba SP', '2019', '<p>Texto da página três.</p>');

INSERT INTO tags (id, title) VALUES (1, 'concreto'), (2, 'habitação'), (3, 'São Paulo');
INSERT INTO articles_tags (article_id, tag_id) VALUES (101, 1), (101, 3), (102, 2);

INSERT INTO projectauthors (id, firstname, lastname, email) VALUES (1, 'Escritório', 'Exemplo', NULL);
INSERT INTO articles_projectauthors (article_id, projectauthor_id) VALUES (601, 1);

INSERT INTO images (id, src, is_cover, img_order, source, credit) VALUES
  (1001, 'media/images/magazines/fixture_101_a.jpg', 1, 1, NULL, 'Foto Ana Exemplo'),
  (1002, 'media/images/magazines/fixture_101_b.jpg', 0, 2, NULL, NULL),
  (2001, 'media/images/magazines/fixture_201_a.jpg', 1, 1, NULL, 'Foto Daniel Fixture'),
  (3011, 'media/images/magazines/fixture_301.jpg',   1, 1, NULL, NULL),
  (3021, 'media/images/magazines/fixture_302.jpg',   1, 1, NULL, NULL),
  (3031, 'media/images/magazines/fixture_303.jpg',   1, 1, NULL, NULL),
  (3041, 'media/images/magazines/fixture_304.jpg',   1, 1, NULL, NULL),
  (6001, 'media/images/magazines/fixture_601_a.jpg', 1, 1, NULL, NULL),
  (6002, 'media/images/magazines/fixture_601_b.jpg', 0, 2, NULL, NULL);

INSERT INTO articles_images (article_id, image_id) VALUES
  (101, 1001), (101, 1002), (201, 2001),
  (301, 3011), (302, 3021), (303, 3031), (304, 3041),
  (601, 6001), (601, 6002);

-- Caption with HTML: regression case for "HTML tags showing in image captions"
INSERT INTO captions (id, image_id, language_id, caption) VALUES
  (1, 1001, 1, 'Edifício <em>Copan</em>, São Paulo<br />Foto Ana Exemplo'),
  (2, 1002, 1, 'Planta & corte'),
  (3, 1001, 2, 'Copan building');
