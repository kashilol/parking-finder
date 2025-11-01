FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install root dependencies
RUN npm install

# Install server dependencies
WORKDIR /app/server
RUN npm install

# Install client dependencies and build
WORKDIR /app/client
RUN npm install
RUN npm run build

# Copy all source code
WORKDIR /app
COPY . .

# Expose ports
EXPOSE 3000

# Start server
CMD ["npm", "start"]
