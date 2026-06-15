FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install packages
RUN npm ci

# Copy code
COPY . .

# Build Next.js
RUN npm run build

EXPOSE 3000

# Start next server
CMD ["npm", "run", "start"]
