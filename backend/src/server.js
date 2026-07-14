import dotenv from "dotenv";
import { fileURLToPath } from "url";

import app from "./app.js";
import { connectDatabase } from "./config/database.js";

dotenv.config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`Karlo Services server running on port ${PORT}`);
      console.log(`API URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(`Application startup failed: ${error.message}`);
    process.exit(1);
  }
};

startServer();
