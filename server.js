const express = require("express");
const path = require("path");

const app = express();
const PORT = 3333;

// Serve the root directory files directly (index.html and editor.js)
app.use(express.static(path.join(__dirname)));

// Set up the root route to serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running at: http://localhost:${PORT}`);
});