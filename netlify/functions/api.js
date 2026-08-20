const serverless = require("serverless-http");
const app = require("../../backend/src/app");

// Το Netlify στέλνει τα αιτήματα /api/* εδώ (βλ. redirect στο netlify.toml).
// Το serverless-http μεταφράζει το Lambda-style event σε κανονικό Express request/response.
exports.handler = serverless(app);
