cat << 'EOF' > /etc/nginx/sites-available/tutelopezmusic.com
server {
    listen 80;
    server_name tutelopezmusic.com www.tutelopezmusic.com;
    root /var/www/tutelopez-music-web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

ln -sf /etc/nginx/sites-available/tutelopezmusic.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d tutelopezmusic.com -d www.tutelopezmusic.com --non-interactive --agree-tos -m mateojoellopezgtamix@gmail.com
