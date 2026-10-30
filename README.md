# BackProtafolio
Back del portafolio

## Agencia IA (`/agencia/*`)

La agencia de agentes (entrevista → análisis → diseño → desarrollo → QA/SEO/seguridad → revisión) vive en `agencia/`
(ESM, sin dependencias) y se monta en este servidor con `src/routes/agenciaRoutes.js`.

- `GET /agencia/api/llm`, `POST /agencia/api/projects`, `GET /agencia/api/projects/:id/events` (SSE), `GET /agencia/sites/:id/` …
- Modo demo público por defecto (`PUBLIC_DEMO=1`): sin código de acceso usa el motor simulado y límites por IP. Con `ACCESS_CODE` + `X-Access-Code` usa el LLM real (`GROQ_API_KEY`, etc.).
- Datos efímeros en `/tmp` (Vercel). Orígenes permitidos: `AGENCIA_ALLOWED_ORIGINS` o `FRONTEND_URL` (coma) + dominios propios.
- La interfaz está en el portafolio (`/agencia-demo`) y apunta acá con `?api=<url>/agencia`.
