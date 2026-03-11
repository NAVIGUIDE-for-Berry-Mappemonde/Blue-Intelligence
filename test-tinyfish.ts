import fetch from "node-fetch";

async function test() {
  console.log("Starting...");
  try {
    const response = await fetch("https://agent.tinyfish.ai/v1/automation/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.TINYFISH_API_KEY || "test"
      },
      body: JSON.stringify({
        url: "https://www.packard.org/",
        goal: "Extract 1 marine conservation project. Return JSON array.",
        browser_profile: "lite"
      })
    });
    console.log("Status:", response.status);
    const text = await response.text();
    console.log("Response:", text);
  } catch (e) {
    console.error(e);
  }
}
test();
