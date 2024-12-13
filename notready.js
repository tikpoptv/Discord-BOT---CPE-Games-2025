const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;

// สร้าง Client
const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

// เมื่อ Bot พร้อม
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// เมื่อมี Interaction
client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.commandName === 'register') {
            const embed = new EmbedBuilder()
                .setColor('#FF4500') // สีโทนส้มแดง (ปรับแต่งได้)
                .setTitle('🚧 ระบบยังไม่เปิดให้ใช้งาน')
                .setDescription(
                    '🔒 **ขณะนี้ระบบ** `ลงทะเบียน` **ยังไม่พร้อมให้บริการ**\n\n' +
                    '📌 **หากพบปัญหาหรือข้อสงสัย**:\n' +
                    'โปรดแจ้งทีมงานที่ [**TIK ปี 2**](#)\n\n' +
                    '🙏 **ขอบคุณสำหรับความเข้าใจและขออภัยในความไม่สะดวก** ❤️'
                )
                .setThumbnail('https://avatars.githubusercontent.com/u/132810684?s=200&v=4') // รูปภาพเล็กด้านบน (สามารถเปลี่ยนได้)
                .addFields(
                    { name: 'สถานะ:', value: '`ยังไม่เปิดใช้งาน`', inline: true },
                    { name: 'ทีมที่รับผิดชอบ:', value: '`TIK ปี 2`', inline: true }
                )
                .setTimestamp(); // ใส่เวลาปัจจุบันลงไปใน Embed

            await interaction.reply({ embeds: [embed], ephemeral: true }); // ส่งข้อความแบบชั่วคราวให้ผู้ใช้
        }
    } catch (error) {
        console.error('Unhandled interaction error:', error);
    }
});

// เข้าสู่ระบบ Bot
client.login(TOKEN);
