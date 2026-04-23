const fs = require('fs');

function build() {
    let html = fs.readFileSync('index.html', 'utf-8');
    const css = fs.readFileSync('style.css', 'utf-8');
    const js = fs.readFileSync('script.js', 'utf-8');

    html = html.replace('<link rel="stylesheet" href="style.css">', `<style>${css}</style>`);
    html = html.replace('<script src="script.js"></script>', `<script>${js}</script>`);

    if (fs.existsSync('harold.png')) {
        const haroldBuffer = fs.readFileSync('harold.png');
        const haroldB64 = haroldBuffer.toString('base64');
        html = html.replace('src="harold.png"', `src="data:image/png;base64,${haroldB64}"`);
    }

    if (fs.existsSync('soothing.png')) {
        const soothingBuffer = fs.readFileSync('soothing.png');
        const soothingB64 = soothingBuffer.toString('base64');
        html = html.replace('src="soothing.png"', `src="data:image/png;base64,${soothingB64}"`);
    }

    fs.writeFileSync('StressTestStandalone.html', html);
    console.log('Standalone export complete: StressTestStandalone.html');
}

build();
