// Τοπικό dev server. Στο production (Netlify) το ίδιο app.js "τυλίγεται"
// από το netlify/functions/api.js με το serverless-http, χωρίς app.listen.
const app = require("./app");

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
