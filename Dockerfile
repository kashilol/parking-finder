FROM node:18-alpine

WORKDIR /app

# Copy all source code FIRST
COPY . .

# Install root dependencies
RUN npm install

# Install server dependencies
WORKDIR /app/server
RUN npm install

# Install client dependencies and build
WORKDIR /app/client
RUN npm install
RUN npm run build

# Back to root
WORKDIR /app

# Expose ports
EXPOSE 3000

# Start server
CMD ["npm", "start"]
