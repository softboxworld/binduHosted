const fs = require("fs");
const path = require("path");

const distDir = path.resolve(__dirname, "..", "dist");
const cnamePath = path.join(distDir, "CNAME");
const indexPath = path.join(distDir, "index.html");
const notFoundPath = path.join(distDir, "404.html");

if (!fs.existsSync(distDir)) {
  console.error(`dist folder not found at: ${distDir}`);
  process.exit(1);
}

// GitHub Pages custom domain
fs.writeFileSync(cnamePath, "mybindu.app", "utf8");

// SPA routing fallback for GitHub Pages
if (!fs.existsSync(indexPath)) {
  console.error(`index.html not found at: ${indexPath}`);
  process.exit(1);
}
fs.copyFileSync(indexPath, notFoundPath);

console.log("Prepared dist for GitHub Pages (CNAME + 404.html).");

