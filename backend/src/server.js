import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/api/v1/health", (req, res) => {
  res.json({ status: "healthy" });
});

app.get("/api/v1/scores", (req, res) => {
  res.json({
    ok: true,
    data: [
      { sport: "NBA", home: "Lakers", away: "Warriors", homeScore: 102, awayScore: 98 }
    ]
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
