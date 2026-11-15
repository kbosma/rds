#!/bin/bash

echo "*************************" && \
echo "* Build all" && \
echo "*************************" && \
cd "$(dirname "$0")" && \
./deploy-nginx.sh && \
./build-deploy-backend.sh && \
./build-deploy-frontend-employee.sh && \
./build-deploy-frontend-booker.sh
