const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
      }
    } else {
      if (file === 'package.json') {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

const files = getAllFiles('.');
const updatedFiles = [];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;
  // Regex to match "typescript": "^5.x.x"
  // We handle both single and double quotes, though package.json should be double.
  const regex = /"typescript":\s*"\^5\.[0-9]+\.[0-9]+"/g;
  
  if (regex.test(content)) {
    content = content.replace(regex, '"typescript": "^5.9.3"');
    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      updatedFiles.push(file);
    }
  }
});

console.log('Updated files:');
updatedFiles.forEach(f => console.log(f));
