const Groq = require('groq-sdk');
const Proyect = require('../models/Proyect');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Groq da de baja modelos con el tiempo. Si el configurado (GROQ_MODEL) ya no existe, se reintenta con estos, en orden.
const FALLBACK_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant'];
const isGone = (e) => e && (e.status === 404 || e.status === 400 || e.error?.error?.code === 'model_not_found' || /model_not_found|decommissioned|does not exist/i.test(String(e.message)));

async function createCompletion(params) {
  const models = [...new Set([process.env.GROQ_MODEL, ...FALLBACK_MODELS].filter(Boolean))];
  let lastErr;
  for (const model of models) {
    try {
      return await groq.chat.completions.create({ ...params, model });
    } catch (e) {
      lastErr = e;
      if (!isGone(e)) throw e;
      console.warn(`[Groq] modelo no disponible (${model}); probando el siguiente`);
    }
  }
  throw lastErr;
}

// ─── Prompt base del asistente ───────────────────────────────────────────────
const BASE_SYSTEM_PROMPT = `Eres el asistente de inteligencia artificial de TinchoDev, un desarrollador full-stack argentino especializado en aplicaciones web modernas, APIs REST, integraciones con servicios externos y soluciones digitales a medida.

## TU ROL
1. **Asesor de presupuestos**: Basarte en proyectos REALES del portfolio para dar estimaciones honestas y fundamentadas.
2. **Consultor técnico**: Explicar tecnologías, arquitecturas y decisiones de diseño de forma clara.
3. **Representante profesional**: Reflejar la calidad, prolijidad y pasión del desarrollador.

## REGLAS FUNDAMENTALES
- Responde siempre en el idioma del usuario (español o inglés).
- Nunca inventes proyectos o características que no existen en el portfolio.
- Cuando estimes presupuestos, explica QUÉ incluye y QUÉ factores pueden modificar el precio.
- Si el cliente no tiene claro qué necesita, guíalo con preguntas inteligentes.
- Sé honesto con los tiempos: mejor prometer poco y entregar más.
- Menciona proyectos del portfolio como referencia cuando sean relevantes.
- Si algo está fuera del alcance actual, dilo con alternativas posibles.

## STACK TECNOLÓGICO
- **Frontend**: React, Next.js, HTML/CSS, Tailwind CSS
- **Backend**: Node.js, Express
- **Bases de datos**: MongoDB (Mongoose), MySQL
- **Integraciones**: Google Calendar API, Mercado Pago, Nodemailer, WhatsApp Business API
- **Auth**: JWT, Google OAuth2
- **IA**: Groq (LLaMA), OpenAI API
- **Deploy**: Vercel, Railway, Render
- **Herramientas**: Git, Docker (básico), Postman

## ESTRUCTURA DE PRECIOS BASE (USD)
| Tipo de proyecto | Rango |
|---|---|
| Landing page estática | $150 – $350 |
| Sitio web corporativo | $350 – $700 |
| E-commerce básico | $500 – $1.000 |
| E-commerce avanzado | $1.000 – $2.500 |
| API REST completa | $400 – $900 |
| App full-stack con auth | $700 – $1.500 |
| Integración externa (pagos, calendario, etc.) | +$150 – $400 c/u |
| Sistema con IA integrada | +$400 – $800 |
| Dashboard/Panel admin | +$300 – $600 |
| Sistema de rifas / sorteos | $400 – $800 |

## IMPORTANTE
Estos son rangos orientativos. El presupuesto final siempre depende del scope real del proyecto.
Cuando un cliente pregunte por precios, pide detalles antes de dar un número. Un buen presupuesto requiere entender bien el problema.
`;

// ─── Construir prompt dinámico con proyectos actuales ────────────────────────
async function buildSystemPrompt() {
  try {
    const projects = await Proyect.find().lean();

    if (!projects.length) {
      return BASE_SYSTEM_PROMPT + '\n\n> ⚠️ El portfolio aún no tiene proyectos cargados.';
    }

    const projectsContext = projects
      .map(
        (p, i) =>
          `### ${i + 1}. ${p.title} (${p.type})
- **Descripción**: ${p.description}
- **Tecnologías**: ${p.technologies}
- **Demo en vivo**: ${p.deployUrl || 'No disponible'}
- **Repositorio**: ${p.repositoryUrl || 'Privado'}`
      )
      .join('\n\n');

    return `${BASE_SYSTEM_PROMPT}

---
## PORTFOLIO ACTUAL (${projects.length} proyecto${projects.length !== 1 ? 's' : ''} cargado${projects.length !== 1 ? 's' : ''})

${projectsContext}

---
> Usa estos proyectos como contexto real al hablar con clientes. Menciónalos cuando sean relevantes para demostrar experiencia real.
`;
  } catch (error) {
    console.error('[GroqService] Error cargando proyectos para el prompt:', error.message);
    return BASE_SYSTEM_PROMPT;
  }
}

// ─── Chat general ─────────────────────────────────────────────────────────────
async function chat(messages, options = {}) {
  const systemPrompt = await buildSystemPrompt();

  const completion = await createCompletion({
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 1200,
  });

  return completion.choices[0]?.message?.content ?? 'No pude generar una respuesta. Intentá de nuevo.';
}

// ─── Estimación de presupuesto especializada ──────────────────────────────────
async function estimateBudget(description, requirements = []) {
  const systemPrompt = await buildSystemPrompt();

  const budgetRequest = `Actúa como consultor senior de proyectos digitales. Analiza el siguiente proyecto y elabora un presupuesto profesional con este formato exacto:

---
## 💼 Análisis del Proyecto

[Resumen breve de lo que entendiste que el cliente necesita]

## 💰 Estimación de Costo
**Rango**: $X.XXX – $X.XXX USD  
**Motivo del rango**: [explicar qué determina el precio mínimo vs máximo]

## ⏱️ Tiempo Estimado
**Duración**: X – X semanas  
**Fases**: [listar fases principales]

## 🛠️ Stack Tecnológico Recomendado
[Listar tecnologías con justificación breve]

## 📋 Desglose del Proyecto
[Listar los módulos/funcionalidades principales con su complejidad]

## 🔗 Proyectos de Referencia
[Mencionar proyectos del portfolio similares, si los hay]

## ⚠️ Factores que pueden modificar el precio
[Listar qué podría subir o bajar el costo]

## 🚀 Próximos Pasos
[Qué necesitaría saber para dar un presupuesto más preciso]
---

**Proyecto a presupuestar:**
${description}

${requirements.length ? `**Requisitos específicos mencionados:**\n${requirements.map((r) => `- ${r}`).join('\n')}` : ''}
`;

  const completion = await createCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: budgetRequest },
    ],
    temperature: 0.3, // Más determinístico para presupuestos
    max_tokens: 2000,
  });

  return completion.choices[0]?.message?.content ?? 'No pude generar el presupuesto.';
}

// ─── Análisis técnico de un proyecto nuevo ───────────────────────────────────
async function analyzeNewProject(projectData) {
  const systemPrompt = await buildSystemPrompt();

  const analysisRequest = `Se acaba de agregar un nuevo proyecto al portfolio. Analízalo brevemente y genera:
1. Una descripción corta y atractiva para clientes (máx 2 oraciones)
2. Las 3 tecnologías clave que más destacan
3. Qué tipo de clientes podrían estar interesados en algo similar
4. Nivel de complejidad estimado (Básico / Intermedio / Avanzado)

**Datos del proyecto:**
- Título: ${projectData.title}
- Tipo: ${projectData.type}
- Descripción original: ${projectData.description}
- Tecnologías: ${projectData.technologies}

Responde en JSON con este formato:
{
  "clientDescription": "...",
  "keyTechnologies": ["...", "...", "..."],
  "targetClients": "...",
  "complexity": "Básico | Intermedio | Avanzado",
  "estimatedRange": "$X – $X USD"
}`;

  const completion = await createCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: analysisRequest },
    ],
    temperature: 0.2,
    max_tokens: 600,
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  try {
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return { raw };
  }
}

module.exports = { chat, estimateBudget, analyzeNewProject, buildSystemPrompt };
