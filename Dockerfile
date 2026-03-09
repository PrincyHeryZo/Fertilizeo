# Use Node.js LTS
FROM node:22-slim

# Set working directory
WORKDIR /app

# Install dependencies first (for caching)
COPY package*.json ./
RUN npm install --production

# Copy application code
COPY . .

# Build the frontend
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
