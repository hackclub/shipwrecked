const express = require('express');
const app = express();

const port = process.env.PORT || 3003;
const SLACK_NOTIFICATION_WEBHOOK = process.env.SLACK_NOTIFICATION_WEBHOOK;

// Middleware to parse JSON
app.use(express.json());

app.get("/", (req, res) => res.send("Hello"));

// Simple POST endpoint that accepts JSON
app.post('/webhook', async (req, res) => {
  const data = req.body;

  const message = body.attachments[0].blocks[1].text.text.split("\n")[0];
  const payload = {"text": message};

  await fetch(SLACK_NOTIFICATION_WEBHOOK, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  res.status(200).end();
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
