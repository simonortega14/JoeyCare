FROM nginx:alpine
COPY ./dist /usr/share/nginx/html
RUN printf 'server { listen 80; root /usr/share/nginx/html; index index.html; location / { try_files \$uri /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
