import fs from 'fs';

async function testUpload() {
    const fileContent = fs.readFileSync('package.json');
    const buffer = Buffer.from(fileContent);
    const blob = new Blob([buffer], { type: 'application/json' });

    const formData = new FormData();
    formData.append('file', blob, 'package.json');

    try {
        const res = await fetch('https://barberiaapi-em5q.onrender.com/api/Images/upload', {
            method: 'POST',
            body: formData
        });
        console.log('Status:', res.status);
        console.log('Body:', await res.text());
    } catch (error) {
        console.error('Error:', error);
    }
}

testUpload();
