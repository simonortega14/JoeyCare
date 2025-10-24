import express from 'express';
const app = express();
const PORT = process.env.PORT || 3004;
const NAME = process.env.SVC_NAME || 'ms-reportes';

app.get('/', (_req, res) => res.send(`OK from ${NAME}`));
app.get('/health', (_req, res) => res.json({ ok: true, svc: NAME }));

app.listen(PORT, () => console.log(`[${NAME}] up on :${PORT}`));
