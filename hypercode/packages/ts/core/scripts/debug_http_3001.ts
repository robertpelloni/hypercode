
import http from 'http';

async function checkHttp(url: string) {
    console.log(`GET ${url}...`);
    return new Promise((resolve) => {
        const req = http.get(url, (res) => {
            console.log(`STATUS: ${res.statusCode}`);
            console.log(`HEADERS: ${JSON.stringify(res.headers, null, 2)}`);
            res.resume();
            resolve(true);
        });
        req.on('error', (e) => {
            console.log(`ERROR: ${e.message}`);
            resolve(false);
        });
    });
}

checkHttp('http://localhost:3001');
