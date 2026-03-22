const fs = require('fs');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = dir + '/' + f;
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else if (f.endsWith('Page.tsx')) {
      callback(dirPath);
    }
  });
}

let modifiedFiles = 0;
walkDir('C:/Users/samue/OneDrive/Escritorio/PRoyectos/Front4/src/features', (file) => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Center all left-aligned headers
    if (content.includes('text-left')) {
        content = content.replace(/className="text-left/g, 'className="text-center');
        changed = true;
    }
    
    // Center all un-centered data cells
    if (content.includes('className="py-4 px-4"')) {
        content = content.replace(/className="py-4 px-4"/g, 'className="py-4 px-4 text-center"');
        changed = true;
    }
    
    // Some are py-4 px-3 or similar... let's replace them carefully!
    
    if (content.includes('useState(5)') && content.includes('itemsPerPage')) {
       // Only change itemsPerPage declarations that use useState(5)
       content = content.replace(/const \[itemsPerPage, setItemsPerPage\] = useState\(5\);/g, 'const [itemsPerPage, setItemsPerPage] = useState(10);');
       content = content.replace(/const \[itemsPerPage\] = useState\(5\);/g, 'const [itemsPerPage] = useState(10);');
       // In Ventas handles
       content = content.replace(/setItemsPerPage\(5\)/g, 'setItemsPerPage(10)');
       changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content);
        modifiedFiles++;
        console.log('Modified:', file.split('/').pop());
    }
});
console.log('Total files modified:', modifiedFiles);
