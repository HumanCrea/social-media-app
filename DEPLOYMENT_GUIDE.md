# Self-Hosting Deployment Guide

This guide covers multiple options for hosting your social media app with full control over deployment.

## 🏠 Self-Hosting Options

### 1. Android Phone Hosting (Termux + Node.js)

Your rooted Android phone can serve as a full web server!

#### Setup Termux Environment:
```bash
# Install Termux from F-Droid (better than Play Store version)
# In Termux:
pkg update && pkg upgrade
pkg install nodejs npm git nginx postgresql
```

#### Deploy Your App:
```bash
# Clone your repository
git clone https://github.com/HumanCrea/social-media-app.git
cd social-media-app

# Install dependencies
npm install
cd client && npm install && npm run build
cd ../server && npm install

# Setup environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials
```

#### Run with PM2 (Process Manager):
```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'social-media-backend',
      script: 'server/src/index.ts',
      interpreter: 'node',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
EOF

# Start the application
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

#### Setup Nginx Reverse Proxy:
```nginx
# /data/data/com.termux/files/usr/etc/nginx/nginx.conf
server {
    listen 80;
    server_name your-domain.com;  # or your phone's IP
    
    # Serve React build files
    location / {
        root /data/data/com.termux/files/home/social-media-app/client/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy API requests
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. Raspberry Pi / Linux VPS Hosting

#### Quick Setup Script:
```bash
#!/bin/bash
# deploy.sh - Run this on your Pi/VPS

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js, PostgreSQL, Nginx
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs postgresql postgresql-contrib nginx

# Clone and setup
git clone https://github.com/HumanCrea/social-media-app.git
cd social-media-app

# Install and build
npm install
cd client && npm install && npm run build
cd ../server && npm install

# Setup PostgreSQL
sudo -u postgres createdb social_media
sudo -u postgres createuser -s $USER

# Setup environment
cp .env.example .env
echo "DATABASE_URL=postgresql://localhost:5432/social_media" >> .env

# Run migrations
npm run prisma:migrate

# Setup systemd service
sudo tee /etc/systemd/system/social-media.service > /dev/null <<EOF
[Unit]
Description=Social Media App
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/social-media-app/server
ExecStart=/usr/bin/node src/index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Start service
sudo systemctl enable social-media
sudo systemctl start social-media
```

### 3. Docker Deployment

#### Create Dockerfile for backend:
```dockerfile
# server/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "start"]
```

#### Docker Compose Setup:
```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: social_media
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./server
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/social_media
      NODE_ENV: production
    ports:
      - "3001:3001"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./client/dist:/usr/share/nginx/html
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - backend

volumes:
  postgres_data:
```

### 4. Dynamic DNS Setup (Access from anywhere)

#### Using Duck DNS (Free):
```bash
# Install Duck DNS client
curl -o duckdns.sh "https://www.duckdns.org/update?domains=yourdomain&token=yourtoken&ip="
chmod +x duckdns.sh

# Add to crontab for automatic updates
echo "*/5 * * * * /path/to/duckdns.sh >/dev/null 2>&1" | crontab -
```

### 5. CloudFlare Tunnel (Secure Remote Access)

#### Setup CloudFlare Tunnel:
```bash
# Download cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create social-media-app

# Configure tunnel
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: social-media-app
credentials-file: /home/user/.cloudflared/your-tunnel-id.json

ingress:
  - hostname: your-domain.com
    service: http://localhost:80
  - service: http_status:404
EOF

# Run tunnel
cloudflared tunnel run social-media-app
```

## 📱 Android Phone Specific Advantages

### Why Android Hosting is Great:
- **Always On**: Phones are designed to run 24/7
- **Low Power**: Very energy efficient
- **Built-in UPS**: Battery backup during power outages  
- **Mobile Data**: Backup internet connection
- **Root Access**: Full system control
- **ARM Optimization**: Modern ARM chips are very efficient

### Performance Tips:
```bash
# In Termux, optimize for server use:
# Prevent Android from killing Termux
termux-wake-lock

# Set CPU governor to performance
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Increase file limits
ulimit -n 65536
```

### Security Setup:
```bash
# Setup firewall (if rooted with iptables)
# Allow only necessary ports
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -j DROP

# Setup SSH for remote management
pkg install openssh
sshd
# Setup key-based authentication
```

## 🚀 Quick Start Command

Run this one-liner to get started immediately:

```bash
curl -fsSL https://raw.githubusercontent.com/yourusername/social-media-app/main/scripts/quick-deploy.sh | bash
```

## 🔧 Monitoring & Maintenance

### Setup Log Rotation:
```bash
# Add to logrotate
sudo tee /etc/logrotate.d/social-media << 'EOF'
/home/user/social-media-app/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 user user
}
EOF
```

### Health Check Script:
```bash
#!/bin/bash
# health-check.sh
curl -f http://localhost:3001/api/health || systemctl restart social-media
```

This gives you complete control over your deployment with multiple backup options!