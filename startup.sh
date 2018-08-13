#!/bin/sh
apiUrl=${MINIENV_API_URL}
if [[ -z  ${apiUrl} ]]; then
    apiUrl=""
fi
sed -i 's|$apiUrl|'${apiUrl}'|g' /usr/share/nginx/html/js/consts.js
nginx -g 'daemon off;'