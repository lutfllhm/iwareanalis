FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install packages
RUN npm ci

# Copy Prisma schema and code
COPY prisma ./prisma/
COPY src ./src/

# Generate Prisma Client & Build TypeScript code
RUN npx prisma generate
RUN npm run build

EXPOSE 5000

# Start server
CMD ["node", "dist/app.js"]
