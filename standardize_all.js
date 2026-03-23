const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach( f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
};

const targetDir = path.join(__dirname, 'src', 'features');

walk(targetDir, (filePath) => {
  if (filePath.endsWith('Page.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Standardize itemsPerPage to 5
    content = content.replace(/(const\s*\[\s*itemsPerPage(?:\s*,\s*setItemsPerPage)?\s*\]\s*=\s*useState\s*\()(\d+)(\s*\))/g, '$15$3');

    // Standardize th classes
    // We target th that look like headers in a table
    const thRegex = /<th[^>]+className=["']([^"']*)["'][^>]*>/g;
    content = content.replace(thRegex, (match, classes) => {
        // Only replace if it looks like a table header class list
        if (classes.includes('py-') || classes.includes('font-') || classes.includes('text-')) {
            return match.replace(classes, 'text-center py-3 px-4 text-white-primary font-bold text-sm');
        }
        return match;
    });

    // Standardize td classes to text-center
    // Avoid replacing td in components that are NOT the main table rows, 
    // but usually in these Page.tsx files, the main table is the only one with many td.
    const tdRegex = /<td[^>]+className=["']([^"']*)["'][^>]*>/g;
    content = content.replace(tdRegex, (match, classes) => {
        if (!classes.includes('text-center') && !match.includes('actions')) {
            let newClasses = classes;
            if (!newClasses.includes('text-center')) newClasses += ' text-center';
            if (!newClasses.includes('py-4')) newClasses = newClasses.replace(/py-\d+/, 'py-4');
            if (!newClasses.includes('px-4')) newClasses = newClasses.replace(/px-\d+/, 'px-4');
            // If it didn't have py/px at all, add them
            if (!newClasses.includes('py-4')) newClasses += ' py-4';
            if (!newClasses.includes('px-4')) newClasses += ' px-4';
            
            return match.replace(classes, newClasses.trim());
        }
        return match;
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  }
});
