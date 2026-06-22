const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:123456@localhost:5432/property_db' });
client.connect()
  .then(() => client.query("SELECT id, title, ST_AsText(location) as loc FROM properties WHERE title LIKE '%Đồng Phú%' OR title LIKE '%Đồng Nai%'"))
  .then(res => console.log(res.rows))
  .catch(console.error)
  .finally(() => client.end());
