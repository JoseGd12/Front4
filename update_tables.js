const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else if (f.endsWith('Page.tsx')) {
      callback(dirPath);
    }
  });
}

const tableClassUpdates = [
  { match: /className=\"text-left/g, replace: 'className=\"text-center' },
  { match: /<th className=\"text-center font-bold text-white-primary pb-4\">/g, replace: '<th className=\"text-center py-3 px-4 text-white-primary font-bold text-sm\">' },
  { match: /<th className=\"text-right font-bold text-white-primary pb-4\">/g, replace: '<th className=\"text-center py-3 px-4 text-white-primary font-bold text-sm\">' },
  { match: /className=\"py-4 px-4\"/g, replace: 'className=\"py-4 px-4 text-center\"' },
  { match: /className=\"py-4 px-3\"/g, replace: 'className=\"py-4 px-4 text-center\"' },
  { match: /className=\"py-3 px-4\"/g, replace: 'className=\"py-4 px-4 text-center\"' },
  { match: /className=\"p-3\"/g, replace: 'className=\"py-4 px-4 text-center\"' },
  { match: /className=\"px-4 py-3\"/g, replace: 'className=\"py-4 px-4 text-center\"' },
  { match: /className=\"py-2 px-4\"/g, replace: 'className=\"py-4 px-4 text-center\"' },
  { match: /className=\"py-3 px-3\"/g, replace: 'className=\"py-4 px-4 text-center\"' },
  { match: /<th className=\"text-center py-2 px-4 text-white-primary font-bold text-sm\">/g, replace: '<th className=\"text-center py-3 px-4 text-white-primary font-bold text-sm\">' },
  { match: /<th className=\"text-center py-3 px-3 text-white-primary font-bold text-sm\">/g, replace: '<th className=\"text-center py-3 px-4 text-white-primary font-bold text-sm\">' },
  { match: /<th className=\"px-4 py-3 text-center/g, replace: '<th className=\"text-center py-3 px-4' },
  { match: /className=\"py-4 px-4 text-left/g, replace: 'className=\"py-4 px-4 text-center' }
];

walkDir('C:/Users/samue/OneDrive/Escritorio/PRoyectos/Front4/src/features', (file) => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    
    tableClassUpdates.forEach(update => {
        content = content.replace(update.match, update.replace);
    });

    if (content !== originalContent) {
        fs.writeFileSync(file, content);
        console.log('Modified:', path.basename(file));
    }
});
