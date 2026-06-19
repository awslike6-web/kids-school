const fetch = require('node-fetch');

const PROXY_URL = "https://minmin-notion.awslike6.workers.dev";
const INVENTORY_DB_ID = "374a27115b688042bb61e6a102242e12";

async function run() {
    const fs = require('fs');
    try {
        const response = await fetch(`${PROXY_URL}/v1/databases/${INVENTORY_DB_ID}/query`, { 
            method: "POST", 
            headers: { 
                "Content-Type": "application/json",
                "Notion-Version": "2022-06-28"
            }, 
            body: JSON.stringify({ filter: { property: "이름", title: { equals: "민수" } } }) 
        });
        
        const data = await response.json(); 
        fs.writeFileSync('test_query_result.json', JSON.stringify(data, null, 2));
    } catch(err) {
        fs.writeFileSync('test_query_result.json', JSON.stringify({ error: err.message }));
    }
}
run();