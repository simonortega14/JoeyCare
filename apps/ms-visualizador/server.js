import express from 'express';
const app = express();
const PORT = process.env.PORT || 3003;
const NAME = process.env.SVC_NAME || 'ms-visualizador';

app.get('/', (_req, res) => res.send(`OK from ${NAME}`));
app.get('/health', (_req, res) => res.json({ ok: true, svc: NAME }));

app.listen(PORT, () => console.log(`[${NAME}] up on :${PORT}`));
