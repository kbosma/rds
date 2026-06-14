#!/bin/bash

echo "*************************" && \
echo "* Build all" && \
echo "*************************" && \
cd "$(dirname "$0")" && \
./build-deploy-backend.sh && \
./build-deploy-frontend-employee.sh && \
./build-deploy-frontend-booker.sh
