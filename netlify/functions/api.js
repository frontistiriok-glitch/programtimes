const serverless = require("serverless-http");
const app = require("../../backend/src/app");

// Το Netlify στέλνει τα αιτήματα /api/* εδώ (βλ. redirect στο netlify.toml).
// Το serverless-http μεταφράζει το Lambda-style event σε κανονικό Express request/response.
//
// ΣΗΜΑΝΤΙΚΟ: το export Excel επιστρέφει binary buffer (.xlsx). Χωρίς τη ρύθμιση "binary",
// το serverless-http το περνάει σαν να ήταν κείμενο (UTF-8), αλλοιώνοντας τα bytes και
// παράγοντας κατεστραμμένο αρχείο που δεν ανοίγει το Excel/LibreOffice.
exports.handler = serverless(app, {
  binary: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",
  ],
});
