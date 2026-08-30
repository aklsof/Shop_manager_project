const fs = require('fs');
const path = require('path');

if (process.argv.length < 3) {
    console.error("Please provide the path to server.js");
    process.exit(1);
}

const serverJsPath = process.argv[2];
let content = fs.readFileSync(serverJsPath, 'utf8');

const patch = `const fs = require('fs');
if (fs.existsSync(path.join(__dirname, '.env.local'))) {
  const envConfig = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
  envConfig.split('\\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/['"]+/g, '');
  });
}`;

if (!content.includes('envConfig.split')) {
    content = content.replace('const dir = path.join(__dirname)', 'const dir = path.join(__dirname)\n\n' + patch);
    fs.writeFileSync(serverJsPath, content, 'utf8');
    console.log('Patched server.js successfully!');
} else {
    console.log('server.js is already patched.');
}
