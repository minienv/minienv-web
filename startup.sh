#!/bin/sh
apiUrl=${EXUP_API_URL}
if [[ -z  ${apiUrl} ]]; then
    apiUrl=""
fi
sed -i 's|$apiUrl|'${apiUrl}'|g' /usr/share/nginx/html/js/app.js
nginx -g 'daemon off;'