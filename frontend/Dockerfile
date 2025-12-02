FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
#FROM node:18-alpine
#
#WORKDIR /app
#
#RUN npm install -g serve
#
#COPY --from=builder /app/build ./build
#
#EXPOSE 8080
#
#CMD ["serve", "-s", "build", "-l", "8080"]

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
