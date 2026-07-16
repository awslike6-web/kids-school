const PROXY_URL = "https://minmin-notion.awslike6.workers.dev";
const DB_ID = "374a27115b688042bb61e6a102242e12";

async function run() {
    try {
        const res = await fetch(`${PROXY_URL}/v1/databases/${DB_ID}`, {
            method: 'GET',
            headers: {
                'Notion-Version': '2022-06-28', // or standard proxy headers
            }
        });
        const data = await res.json();
        const fs = require('fs');
        fs.writeFileSync('db_schema.json', JSON.stringify(data, null, 2));
    } catch(err) {
        require('fs').writeFileSync('db_schema.json', err.toString());
    }
}
run();