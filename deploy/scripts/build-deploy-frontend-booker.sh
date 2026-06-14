#!/bin/bash

echo "*************************" && \
echo "* Build frontend booker" && \
echo "*************************" && \
cd "$(dirname "$0")" && \
cd ../../frontend-booker && \
npx ng build --configuration production --base-href /booker/ && \
echo "*************************" && \
echo "* Copy frontend booker to remote" && \
echo "*************************" && \
scp -r dist/frontend-booker/browser/* root@software.kbtg:/var/www/booker && \
echo "*************************" && \
echo "* Reload nginx (flushes cache)" && \
echo "*************************" && \
ssh root@software.kbtg "systemctl reload nginx" && \
echo "READY!!!"
