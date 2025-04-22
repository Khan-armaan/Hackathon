module.exports = {
    apps: [{
      name: "hackathon-frontend",
      script: "npm",
      args: "run preview ",  // This will serve the built files
      cwd: "/var/www/Hackathon/project/frontend",
      env: {
        NODE_ENV: "production",
        PORT: 5176,  // Default Vite preview port
          
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      
    }]
  }