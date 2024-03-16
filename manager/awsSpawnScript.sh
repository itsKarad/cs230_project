#!/bin/bash
sudo apt update
sudo apt install docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo chmod 666 /var/run/docker.sock
docker pull akarad158/cs230_worker:ubuntu_v4
docker run -p 8080:8080 -d akarad158/cs230_worker:ubuntu_v4