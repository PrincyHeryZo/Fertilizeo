FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY ../../Documents/MUSIC%20LYRICS/Fertilizeo_v2 .
RUN npm run build
EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "start"]
