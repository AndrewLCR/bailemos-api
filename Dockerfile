# Use Node.js LTS (Long Term Support) version
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm install -g nodemon

# Copy all application files
COPY . .

# Expose the application port
EXPOSE 3000

# Default command (will be overridden by docker-compose for development)
CMD ["npm", "start"]
