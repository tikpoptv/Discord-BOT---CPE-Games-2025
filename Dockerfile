# ใช้ Node.js base image
FROM node:18

# กำหนด working directory ใน container
WORKDIR /usr/src/app

# คัดลอกไฟล์ package.json และ package-lock.json เข้า container
COPY package*.json ./

# ติดตั้ง dependencies
RUN npm install

# คัดลอกไฟล์ทั้งหมดจากโปรเจกต์เข้า container
COPY . .

# กำหนดพอร์ตที่แอปจะรัน
EXPOSE 3000

# คำสั่งเริ่มต้นเพื่อรันแอป
CMD ["node", "index.js"]
