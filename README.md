<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/e59659b1-483a-4af4-b631-27d113f6044d

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create a `.env` file (or `.env.local`) with your API keys:
   - `TINYFISH_API_KEY` (required for agent extraction)
   - `CLAUDE_API_KEY` (required for analyzing scraped data; or use `ANTHROPIC_API_KEY`)
3. Run the app:
   `npm run dev`
