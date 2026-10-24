import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";

const port = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`MiniLedger backend server is running on http://localhost:${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
  });
}

export default app;
