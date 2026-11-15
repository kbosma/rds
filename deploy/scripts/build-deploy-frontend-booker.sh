#!/bin/bash

echo "*************************" && \
echo "* Build frontend booker" && \
echo "*************************" && \
cd "$(dirname "$0")" && \
source ./remote.sh && \
cd ../../frontend-booker && \
npx ng build --configuration production --base-href /booker/ && \
echo "*************************" && \
echo "* Copy frontend booker to remote" && \
echo "*************************" && \
scp -r dist/frontend-booker/browser/* "$REMOTE":/var/www/booker && \
echo "*************************" && \
echo "* Reload nginx (flushes cache)" && \
echo "*************************" && \
ssh "$REMOTE" "systemctl reload nginx" && \
echo "READY!!!"
