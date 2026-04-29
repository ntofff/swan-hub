export default function handler(req, res) {
  const payload = {
    ok: true,
    provider: 'vercel',
    environment: process.env.VERCEL_ENV || 'unknown',
    deployment_id: process.env.VERCEL_DEPLOYMENT_ID || null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    branch: process.env.VERCEL_GIT_COMMIT_REF || null,
    region: process.env.VERCEL_REGION || null,
    host: req.headers.host || null,
    timestamp: new Date().toISOString(),
  };

  console.info(JSON.stringify({ source: 'swan_admin_status_probe', ...payload }));
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(payload);
}
