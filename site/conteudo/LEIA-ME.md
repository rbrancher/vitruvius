# Conteúdo do Vitruvius

Todo o conteúdo do site — artigos, edições e autores — está nesta pasta, em
arquivos de texto (Markdown). Para publicar, basta criar ou editar esses
arquivos; o site é gerado a partir deles.

## Onde fica cada coisa

```
conteudo/
├── autores/
│   └── ana-exemplo.md              ← um arquivo por autor
└── revistas/
    └── arquitextos/                ← uma pasta por revista
        └── 24.286/                 ← uma pasta por edição (ano.número)
            ├── edicao.md           ← dados da edição
            ├── 15321.md            ← um arquivo por artigo
            └── 15322.md
```

As revistas são: `arquitextos`, `arquiteturismo`, `drops`, `minhacidade`,
`entrevista`, `projetos`, `resenhasonline`.

O nome do arquivo de um artigo é o **número do artigo**, que aparece no
endereço da página (`/revistas/read/arquitextos/24.286/15321`). Cada número só
pode ser usado uma vez. `npm run conteudo:validar` mostra o próximo número livre.

## Uma edição: `edicao.md`

```
---
data: 2026-10-01
publicada: true
---
```

- `data` — data de publicação (ano-mês-dia).
- `publicada` — `false` esconde a edição do site.

## Um artigo: `15321.md`

O topo do arquivo, entre as linhas `---`, traz os dados do artigo. Abaixo vem
o texto.

```
---
indice: '01'
titulo: A cidade e o concreto
subtitulo: Notas sobre a arquitetura paulista
autor: ana-exemplo
chamada: Um ensaio sobre forma e matéria.
data: 2026-10-01
publicado: true
resumo: Resumo em português.
resumo_en: English abstract.
tags:
  - concreto
  - São Paulo
imagens:
  - id: 1
    arquivo: /imagens/2026/copan.jpg
    capa: true
    legenda: Edifício *Copan*, São Paulo
    credito: Foto Ana Exemplo
---

Primeiro parágrafo do artigo.

{--image:1--}

Segundo parágrafo, com **negrito**, *itálico* e um [link](https://exemplo.com).

> Uma citação longa.
```

| Campo | O que é | Obrigatório |
|---|---|---|
| `indice` | posição do artigo na edição (`'01'`, `'02'`…) | não |
| `titulo` | título | **sim** |
| `subtitulo` | subtítulo | não |
| `autor` | nome do arquivo do autor em `autores/`, sem `.md` | não |
| `secao` | seção (usada em drops, ex. `ensaio`) | não |
| `chamada` | texto curto que aparece na capa da edição | não |
| `data` | data do artigo (ano-mês-dia) | não |
| `publicado` | `false` deixa o artigo como rascunho, fora do site | não (padrão `true`) |
| `resumo`, `resumo_en`, `resumo_es`, `resumo_it` | resumos por idioma | não |
| `tags` | lista de palavras-chave | não |
| `imagens` | lista de imagens (veja abaixo) | não |
| `paginas` | páginas extras (revista projetos, veja abaixo) | não |
| `formato` | `markdown` (padrão) ou `html` (artigos antigos) | não |

### Imagens

Cada imagem tem um `id` (um número, único dentro do artigo) e um `arquivo`.
Imagens novas ficam em `site/public/imagens/` e são indicadas começando com
`/`, por exemplo `/imagens/2026/copan.jpg`. A imagem com `capa: true` aparece na
capa da edição. Para colocar a imagem no meio do texto, escreva
`{--image:ID--}` sozinho numa linha.

### Artigos com várias páginas (projetos)

Liste as páginas extras em `paginas` e separe o texto de cada página com a
linha `<!-- pagina -->`:

```
paginas:
  - titulo: Implantação
    local: Ubatuba SP
    data: '2019'
---

Texto da primeira página.

<!-- pagina -->

Texto da segunda página.
```

## Um autor: `autores/ana-exemplo.md`

```
---
nome: Ana
sobrenome: Exemplo
instituicao: Universidade de São Paulo
titulacao: Doutora
---

Biografia curta do autor.
```

O nome do arquivo (`ana-exemplo`) é o endereço da página do autor
(`/autor/ana-exemplo`) e é o que se escreve no campo `autor` dos artigos.

## Artigos antigos

Os artigos importados do site antigo têm `formato: html`: o texto deles está em
HTML, como era no sistema antigo. Podem ser editados normalmente, mas
mantendo o HTML.
