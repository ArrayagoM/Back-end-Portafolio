// Agente SEO y VISIBILIDAD (Rocío): plan, archivos, datos estructurados y validación.
// Honestidad: nadie puede garantizar posicionamiento ni apariciones en buscadores o IAs; todo habla de probabilidades y mediciones.
import { deterministicPlan, buildLlmsTxt, detectKind } from '../seo/plan.js';
import { improveWithAI } from '../seo/ai.js';
import { buildSeoAssets, applySeoAssets } from '../seo/assets.js';
import { validateSeo } from '../seo/validate.js';
import { sayLines } from '../seo/say.js';
import { normBrief } from '../seo/util.js';

export const PERSONA = { id: 'seo', name: 'Rocío', role: 'SEO y visibilidad' };

/** planSeo(brief, structure, llm) -> SeoPlan. Los motivos de fallback de la IA quedan en planSeo.lastNotes. */
export async function planSeo(brief, structure, llm) {
  const base = deterministicPlan(brief, structure);
  planSeo.lastNotes = [];
  if (!llm || !llm.available) { planSeo.lastNotes = ['Sin IA: plan determinista.']; return base; }
  const { plan, notes } = await improveWithAI(base, brief, llm);
  planSeo.lastNotes = notes;
  if (plan !== base) {
    const b = normBrief(brief);
    plan.aiVisibility.llmsTxt = buildLlmsTxt(b, detectKind(b), plan.aiVisibility.answerBlock, structure);
  }
  return plan;
}
planSeo.lastNotes = [];

export { buildSeoAssets, applySeoAssets, validateSeo, sayLines };
export default { PERSONA, planSeo, buildSeoAssets, applySeoAssets, validateSeo, sayLines };
