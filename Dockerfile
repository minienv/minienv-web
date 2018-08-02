FROM nginx:alpine

MAINTAINER Mark Watson <markwatsonatx@gmail.com>

RUN mkdir /usr/share/nginx/html/auth
COPY auth/callback /usr/share/nginx/html/auth/callback
COPY css /usr/share/nginx/html/css
COPY img /usr/share/nginx/html/img
COPY js /usr/share/nginx/html/js
COPY index.html /usr/share/nginx/html/

COPY startup.sh /startup.sh

WORKDIR /

CMD ["./startup.sh"]
