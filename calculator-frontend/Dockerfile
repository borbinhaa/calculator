# Build stage
FROM node:24-alpine AS build

WORKDIR /app

# npm ci installs exactly what the lockfile pins, so the image is reproducible.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage: the app is static files, so nginx serves them and forwards
# /api to the backend. Same-origin requests mean CORS never comes into play.
FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
