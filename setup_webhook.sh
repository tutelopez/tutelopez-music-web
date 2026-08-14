#!/bin/bash

# 1. Create the webhook listener script
cat << 'EOF' > /var/www/webhook.js
const http = require('http');
const { exec } = require('child_process');

const PORT = 9000;

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/webhook') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            console.log('Webhook received! Triggering rebuild...');
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Rebuild triggered\n');

            exec('cd /var/www/tutelopez-music-web && git pull && npm run build', (error, stdout, stderr) => {
                if (error) {
                    console.error(`Build error: ${error}`);
                    return;
                }
                console.log(`Build stdout: ${stdout}`);
            });
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(`Webhook listener running on port ${PORT}`);
});
EOF

# 2. Create the systemd service file
cat << 'EOF' > /etc/systemd/system/tutelopez-webhook.service
[Unit]
Description=TuteLopez Music Webhook Listener
After=network.target

[Service]
ExecStart=/usr/bin/node /var/www/webhook.js
Restart=always
User=root
Environment=PATH=/usr/bin:/usr/local/bin
Environment=NODE_ENV=production
WorkingDirectory=/var/www/tutelopez-music-web

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
systemctl daemon-reload
systemctl enable tutelopez-webhook
systemctl restart tutelopez-webhook

# 3. Update Nginx configuration
# Insert location /webhook block before the error_page
if ! grep -q "location /webhook" /etc/nginx/sites-available/tutelopezmusic.com; then
    sed -i '/location \/ {/i \    location /webhook {\n        proxy_pass http://127.0.0.1:9000/webhook;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n    }\n' /etc/nginx/sites-available/tutelopezmusic.com
fi

# Reload Nginx
nginx -t && systemctl reload nginx
