
import Database from "better-sqlite3";
const db = new Database("blue_intelligence.db");
const projects = db.prepare("SELECT * FROM projects").all();
const telemetry = db.prepare("SELECT id, engine, target_url, status, projects_found, duration_ms, raw_response, created_at FROM telemetry ORDER BY created_at DESC LIMIT 10").all();
console.log("PROJECTS COUNT:", projects.length);
console.log("PROJECTS:", JSON.stringify(projects, null, 2));
console.log("TELEMETRY (Latest Raw Response):", telemetry[0]?.raw_response);
console.log("TELEMETRY (Summary):", JSON.stringify(telemetry.map(t => ({...t, raw_response: t.raw_response ? t.raw_response.substring(0, 50) + '...' : null})), null, 2));
