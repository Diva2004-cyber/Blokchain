import * as dotenv from "dotenv";
import { createApp } from "./app";

dotenv.config();

const port = process.env.PORT || 3001;
const app = createApp();

app.listen(port, () => {
  console.log(`[Academic Credential API] Service running on http://localhost:${port}`);
  console.log(`[Academic Credential API] Health endpoint: http://localhost:${port}/api/health`);
});
