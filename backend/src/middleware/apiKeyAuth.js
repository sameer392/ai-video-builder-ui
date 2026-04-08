function apiKeyAuth(req, res, next) {
  const configuredApiKey = process.env.SERVER_API_KEY;

  if (!configuredApiKey) {
    return next();
  }

  const requestApiKey = req.header("x-api-key");
  if (requestApiKey !== configuredApiKey) {
    return res.status(401).json({ error: "Unauthorized: invalid API key." });
  }

  return next();
}

module.exports = apiKeyAuth;
