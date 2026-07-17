const webpush = require('web-push');

const chaves = webpush.generateVAPIDKeys();

console.log('Copie as linhas abaixo para o seu arquivo .env:\n');
console.log(`VAPID_PUBLIC_KEY=${chaves.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${chaves.privateKey}`);
