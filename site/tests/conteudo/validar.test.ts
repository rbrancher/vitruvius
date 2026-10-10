import { it } from 'vitest';
import { validateContent, nextArticleId } from '../../src/lib/content';

// Reads every content file and fails with a list of problems (in Portuguese,
// for the editor). `npm run conteudo:validar` runs it on conteudo/.
it('o conteúdo é válido', () => {
  const n = validateContent();
  console.log(`${n.articles} artigos, ${n.editions} edições, ${n.authors} autores. ` +
    `Próximo número de artigo livre: ${nextArticleId()}`);
});
