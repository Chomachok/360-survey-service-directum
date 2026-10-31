# Этап 1. Сборка React-приложения
FROM node:22-alpine AS build

WORKDIR /app

# Копируем файлы зависимостей
COPY package.json package-lock.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем исходный код
COPY . .

# Собираем frontend
RUN npx vite build


# Этап 2. Запуск через Nginx
FROM nginx:alpine AS final

# Удаляем стандартную конфигурацию
RUN rm /etc/nginx/conf.d/default.conf

# Добавляем конфигурацию Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копируем собранное приложение
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]