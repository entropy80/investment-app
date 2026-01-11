module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME || 'investment-app',
      script: 'pnpm',
      args: 'start',
      // Set PM2_APP_DIR environment variable to your application directory
      cwd: process.env.PM2_APP_DIR || process.cwd(),
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000,
      },
      // Log paths - set PM2_APP_DIR or logs will be in current working directory
      error_file: process.env.PM2_APP_DIR ? `${process.env.PM2_APP_DIR}/logs/pm2-error.log` : './logs/pm2-error.log',
      out_file: process.env.PM2_APP_DIR ? `${process.env.PM2_APP_DIR}/logs/pm2-out.log` : './logs/pm2-out.log',
      log_file: process.env.PM2_APP_DIR ? `${process.env.PM2_APP_DIR}/logs/pm2-combined.log` : './logs/pm2-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false
    }
  ]
};
