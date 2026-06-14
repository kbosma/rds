#!/bin/bash

echo "*************************" && \
echo "* Build frontend employee" && \
echo "*************************" && \
cd "$(dirname "$0")" && \
cd ../../frontend-employee && \
npx ng build --configuration production --base-href /rds/ && \
echo "*************************" && \
echo "* Copy frontend employee to remote" && \
echo "*************************" && \
scp -r dist/frontend-employee/browser/* root@software.kbtg:/var/www/rds && \
echo "*************************" && \
echo "* Reload nginx (flushes cache)" && \
echo "*************************" && \
ssh root@software.kbtg "systemctl reload nginx" && \
echo "READY!!!"

