#!/bin/sh
apiUrl=${MINIENV_API_URL}
if [[ -z  ${apiUrl} ]]; then
    apiUrl=""
fi
githubClientId=${MINIENV_GITHUB_CLIENT_ID}
if [[ -z  ${apiUrl} ]]; then
    apiUrl=""
fi
sed -i 's|$apiUrl|'${apiUrl}'|g' /usr/share/nginx/html/js/app.js
sed -i 's|$apiUrl|'${apiUrl}'|g' /usr/share/nginx/html/js/auth.js
sed -i 's|$githubClientId|'${githubClientId}'|g' /usr/share/nginx/html/js/app.js
sed -i 's|$githubClientId|'${githubClientId}'|g' /usr/share/nginx/html/js/auth.js
nginx -g 'daemon off;'