import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('=== Firebase Service Account Setup ===');
console.log('This script will help you set up your Firebase service account credentials.');
console.log('You can either:');
console.log('1. Paste the contents of your service-account-key.json file');
console.log('2. Enter the individual fields manually');
console.log('');

rl.question('Do you want to paste the JSON file contents? (y/n): ', (answer) => {
  if (answer.toLowerCase() === 'y') {
    console.log('Paste your service-account-key.json content below and press Enter twice when done:');
    
    let jsonContent = '';
    let emptyLineCount = 0;
    
    const inputListener = (line) => {
      if (line.trim() === '') {
        emptyLineCount++;
        if (emptyLineCount >= 2) {
          try {
            const serviceAccount = JSON.parse(jsonContent);
            fs.writeFileSync(
              path.join(process.cwd(), 'service-account-key.json'),
              JSON.stringify(serviceAccount, null, 2)
            );
            console.log('Service account key saved successfully!');
            rl.close();
          } catch (error) {
            console.error('Error parsing JSON:', error.message);
            console.log('Please try again with valid JSON content.');
            jsonContent = '';
            emptyLineCount = 0;
          }
        }
      } else {
        jsonContent += line + '\n';
        emptyLineCount = 0;
      }
    };
    
    rl.on('line', inputListener);
  } else {
    // Manual entry
    const serviceAccount = {
      type: 'service_account',
      project_id: '',
      private_key_id: '',
      private_key: '',
      client_email: '',
      client_id: '',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: '',
      universe_domain: 'googleapis.com'
    };
    
    const askQuestion = (question, field) => {
      return new Promise((resolve) => {
        rl.question(question, (answer) => {
          serviceAccount[field] = answer;
          resolve();
        });
      });
    };
    
    const setupManually = async () => {
      await askQuestion('Enter project_id: ', 'project_id');
      await askQuestion('Enter private_key_id: ', 'private_key_id');
      await askQuestion('Enter private_key (paste the entire key including BEGIN/END lines): ', 'private_key');
      await askQuestion('Enter client_email: ', 'client_email');
      await askQuestion('Enter client_id: ', 'client_id');
      
      const clientEmail = serviceAccount.client_email;
      const projectId = serviceAccount.project_id;
      serviceAccount.client_x509_cert_url = 
        `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`;
      
      fs.writeFileSync(
        path.join(process.cwd(), 'service-account-key.json'),
        JSON.stringify(serviceAccount, null, 2)
      );
      
      console.log('Service account key saved successfully!');
      rl.close();
    };
    
    setupManually();
  }
});