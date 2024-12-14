# ใช้ Node.js base image
FROM node:18

WORKDIR /usr/src/app

# คัดลอกไฟล์ package.json และ package-lock.json เข้า container
COPY package*.json ./

# dependencies
RUN npm install


COPY . .

EXPOSE 3000

# คำสั่งเริ่มต้นเพื่อรันแอป
CMD ["node", "index.js"]


# FROM node:18-slim

# WORKDIR /usr/src/app

# COPY package*.json ./

# RUN npm install --only=production

# COPY . .

# CMD ["node", "index.js"]
