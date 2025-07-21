// Simple script to test if the backend server is running correctly
const http = require('http');

console.log('Testing backend connection...');

// Try to connect to the health endpoint
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/health',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('Response:', response);
      
      if (res.statusCode === 200 && response.status === 'ok') {
        console.log('\n✅ Backend server is running correctly!');
      } else {
        console.log('\n❌ Backend server returned an unexpected response.');
      }
    } catch (error) {
      console.error('\n❌ Error parsing response:', error);
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Connection failed:', error.message);
  console.log('\nMake sure the backend server is running with:');
  console.log('  cd backend');
  console.log('  npm start');
});

req.end();