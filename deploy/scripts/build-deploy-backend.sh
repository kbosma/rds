#!/bin/bash

echo "*************************" && \
echo "* Build backend" && \
echo "*************************" && \
cd "$(dirname "$0")" && \
cd ../.. && \
mvn clean package -DskipTests=true && \
echo "*************************" && \
echo "* Stop remote backend" && \
echo "*************************" && \
ssh root@software.kbtg "systemctl stop rds" && \
echo "*************************" && \
echo "* Copy backend to remote" && \
echo "*************************" && \
scp target/rds-0.0.1-SNAPSHOT.jar root@software.kbtg:/opt/rds && \
echo "*************************" && \
echo "* Start remote backend" && \
echo "*************************" && \
ssh root@software.kbtg "systemctl start rds" && \
echo "READY!!!"
