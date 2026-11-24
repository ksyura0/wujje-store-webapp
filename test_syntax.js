const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.log('❌ No script tag found');
  process.exit(1);
}
const jsCode = scriptMatch[1];
try {
  new Function(jsCode);
  console.log('✅ Syntax OK - no errors');
  process.exit(0);
} catch (e) {
  console.log(`❌ SyntaxError: ${e.message}`);
  console.log(`Line info: ${e.toString()}`);
  process.exit(1);
}
