#!/bin/bash

# 📱 Android Phone Deployment Script for Social Media App
# Run this in Termux on your rooted Android device

set -e

echo "🚀 Starting Android deployment for Social Media App..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running in Termux
if [ -z "$TERMUX_VERSION" ]; then
    print_error "This script must be run in Termux on Android"
    exit 1
fi

# Update Termux packages
print_info "Updating Termux packages..."
pkg update -y && pkg upgrade -y

# Install required packages
print_info "Installing required packages..."
pkg install -y nodejs npm git postgresql nginx

# Create app directory
APP_DIR="$HOME/social-media-app"
if [ -d "$APP_DIR" ]; then
    print_warning "Directory exists, updating..."
    cd "$APP_DIR"
    git pull
else
    print_info "Cloning repository..."
    git clone https://github.com/HumanCrea/social-media-app.git "$APP_DIR"
    cd "$APP_DIR"
fi

# Install root dependencies
print_info "Installing root dependencies..."
npm install

# Build client
print_info "Building client application..."
cd client
npm install
npm run build
cd ..

# Install server dependencies
print_info "Installing server dependencies..."
cd server
npm install

# Setup PostgreSQL
print_info "Setting up PostgreSQL..."
if [ ! -d "$PREFIX/var/lib/postgresql" ]; then
    initdb "$PREFIX/var/lib/postgresql"
fi

# Start PostgreSQL if not running
if ! pgrep -f postgres > /dev/null; then
    pg_ctl -D "$PREFIX/var/lib/postgresql" -l "$PREFIX/var/log/postgresql.log" start
    sleep 2
fi

# Create database and user
createdb social_media 2>/dev/null || print_warning "Database may already exist"

# Setup environment variables
print_info "Setting up environment variables..."
if [ ! -f .env ]; then
    cat > .env << EOF
# Database
DATABASE_URL="postgresql://localhost:5432/social_media"

# Server
PORT=3001
NODE_ENV=production

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production-$(date +%s)"

# App URLs
CLIENT_URL="http://localhost:8080"
SERVER_URL="http://localhost:3001"
EOF
fi

# Run database migrations
print_info "Running database migrations..."
npx prisma migrate dev --name init 2>/dev/null || npx prisma db push

# Generate Prisma client
npx prisma generate

# Setup PM2 for process management
print_info "Installing PM2 process manager..."
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'social-media-backend',
    script: 'src/index.js',
    cwd: '/data/data/com.termux/files/home/social-media-app/server',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '../logs/err.log',
    out_file: '../logs/out.log',
    log_file: '../logs/combined.log',
    time: true
  }]
};
EOF

# Create logs directory
mkdir -p ../logs

# Setup Nginx configuration
print_info "Configuring Nginx..."
mkdir -p "$PREFIX/etc/nginx"
cat > "$PREFIX/etc/nginx/nginx.conf" << EOF
worker_processes 1;
error_log $PREFIX/var/log/nginx/error.log;
pid $PREFIX/var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    
    sendfile        on;
    keepalive_timeout  65;
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    server {
        listen 8080;
        server_name localhost;
        
        # Serve React app
        location / {
            root $HOME/social-media-app/client/dist;
            try_files \$uri \$uri/ /index.html;
            
            # Cache static assets
            location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }
        
        # API proxy
        location /api {
            proxy_pass http://127.0.0.1:3001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_cache_bypass \$http_upgrade;
        }
        
        # Socket.io
        location /socket.io {
            proxy_pass http://127.0.0.1:3001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \$host;
        }
    }
}
EOF

# Create startup script
print_info "Creating startup script..."
cat > "$HOME/start-social-media.sh" << 'EOF'
#!/bin/bash

# Start PostgreSQL
if ! pgrep -f postgres > /dev/null; then
    pg_ctl -D "$PREFIX/var/lib/postgresql" -l "$PREFIX/var/log/postgresql.log" start
    sleep 2
fi

# Start the backend with PM2
cd ~/social-media-app/server
pm2 start ecosystem.config.js

# Start Nginx
nginx

# Keep Termux awake
termux-wake-lock

echo "🚀 Social Media App is running!"
echo "📱 Access your app at: http://localhost:8080"
echo "🔧 Backend API at: http://localhost:3001"
echo ""
echo "📊 Monitor with: pm2 monit"
echo "📋 View logs with: pm2 logs"
echo "🛑 Stop with: pm2 stop all && nginx -s quit"
EOF

chmod +x "$HOME/start-social-media.sh"

# Create status check script
cat > "$HOME/check-social-media.sh" << 'EOF'
#!/bin/bash

echo "📊 Social Media App Status"
echo "========================="

echo "🗄️  PostgreSQL:"
if pgrep -f postgres > /dev/null; then
    echo "   ✅ Running"
else
    echo "   ❌ Not running"
fi

echo "⚙️  Backend (PM2):"
pm2 list | grep -q social-media-backend
if [ $? -eq 0 ]; then
    echo "   ✅ Running"
else
    echo "   ❌ Not running"
fi

echo "🌐 Nginx:"
if pgrep -f nginx > /dev/null; then
    echo "   ✅ Running"
else
    echo "   ❌ Not running"
fi

echo ""
echo "🔗 URLs:"
echo "   📱 Frontend: http://localhost:8080"
echo "   🔧 Backend:  http://localhost:3001"

# Test connectivity
if curl -s http://localhost:8080 > /dev/null; then
    echo "   ✅ Frontend accessible"
else
    echo "   ❌ Frontend not accessible"
fi

if curl -s http://localhost:3001/api > /dev/null; then
    echo "   ✅ Backend accessible"
else
    echo "   ❌ Backend not accessible"
fi
EOF

chmod +x "$HOME/check-social-media.sh"

print_status "Deployment completed successfully! 🎉"
echo ""
echo "📋 Next steps:"
echo "1. Run: $HOME/start-social-media.sh"
echo "2. Open browser to: http://localhost:8080"
echo "3. Check status: $HOME/check-social-media.sh"
echo ""
echo "🔧 Management commands:"
echo "   Start:   $HOME/start-social-media.sh"
echo "   Status:  $HOME/check-social-media.sh"
echo "   Monitor: pm2 monit"
echo "   Logs:    pm2 logs"
echo "   Stop:    pm2 stop all && nginx -s quit"
echo ""
print_info "Your phone is now a social media server! 📱→🌐"