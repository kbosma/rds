#!/bin/bash

echo "*************************" && \
echo "* Build backend" && \
echo "*************************" && \
cd "$(dirname "$0")" && \
source ./remote.sh && \
cd ../.. && \
mvn clean package -DskipTests=true && \
echo "*************************" && \
echo "* Stop remote backend" && \
echo "*************************" && \
ssh "$REMOTE" "systemctl stop rds" && \
echo "*************************" && \
echo "* Copy backend to remote" && \
echo "*************************" && \
scp target/rds-0.0.1-SNAPSHOT.jar "$REMOTE":/opt/rds && \
echo "*************************" && \
echo "* Start remote backend" && \
echo "*************************" && \
ssh "$REMOTE" "systemctl start rds" && \
echo "READY!!!"
