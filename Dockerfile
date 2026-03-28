FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "start"]
```

Commit. **Une seule ligne change :**
```
# AVANT
RUN npm install --production

# APRÈS
RUN npm install