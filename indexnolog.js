const { Client, GatewayIntentBits, StringSelectMenuBuilder, ActionRowBuilder, REST, Routes, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const config = require('./config.json'); // นำเข้า config.json
require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// เก็บข้อมูลผู้ใช้
const userData = new Map();

// สร้าง Client
const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

// ฟังก์ชันลบคำสั่งเก่า
const deleteCommands = async () => {
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        console.log('Started deleting all global and guild application (/) commands.');

        const globalCommands = await rest.get(Routes.applicationCommands(CLIENT_ID));
        for (const command of globalCommands) {
            console.log(`Deleting global command: ${command.name}`);
            await rest.delete(`${Routes.applicationCommands(CLIENT_ID)}/${command.id}`);
        }

        const guildCommands = await rest.get(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID));
        for (const command of guildCommands) {
            console.log(`Deleting guild command: ${command.name}`);
            await rest.delete(`${Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)}/${command.id}`);
        }

        console.log('Successfully deleted all application (/) commands.');
    } catch (error) {
        console.error(error);
    }
};

// ฟังก์ชันลงทะเบียนคำสั่งใหม่
const registerCommands = async () => {
    const commands = [
        {
            name: 'register',
            description: 'ลงทะเบียนข้อมูลส่วนตัว (ชื่อ, ชั้นปี, ตำแหน่ง)',
        },
    ];

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
};

// เมื่อ Bot พร้อม
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// ฟังก์ชันรีเซ็ตยศทั้งหมด
const resetRoles = async (interaction) => {
    try {
        const rolesToRemove = interaction.member.roles.cache.filter(
            (role) => role.name !== '@everyone' // ไม่ลบยศเริ่มต้น
        );

        for (const role of rolesToRemove.values()) {
            await interaction.member.roles.remove(role);
        }

        console.log('All roles reset successfully.');
    } catch (error) {
        console.error('Error resetting roles:', error);
        throw new Error('เกิดข้อผิดพลาดในการรีเซ็ตยศ.');
    }
};

// ฟังก์ชันเพิ่มยศและตั้งชื่อเล่น
const addRolesAndSetNickname = async (interaction, user, role) => {
    try {
        if (!role) {
            throw new Error('ตำแหน่ง (role) ไม่มีค่า กรุณาเริ่มต้นใหม่.');
        }

        const rolesToAdd = config.roles[role];
        if (!rolesToAdd) {
            throw new Error(`Role "${role}" not found in config.`);
        }

        for (const roleName of rolesToAdd) {
            const guildRole = interaction.guild.roles.cache.find((r) => r.name === roleName);
            if (guildRole) {
                await interaction.member.roles.add(guildRole);
            } else {
                console.warn(`Role "${roleName}" not found in the server.`);
            }
        }

        const newName = `${user.name} (${user.year})`;
        await interaction.member.setNickname(newName);

        await interaction.editReply({
            content: `ลงทะเบียนสำเร็จ: ชื่อ: **${user.name}**, ชั้นปี: **${user.year}**, ตำแหน่ง: **${role}** พร้อมยศที่เกี่ยวข้อง: ${rolesToAdd.join(', ')}`,
        });
    } catch (error) {
        console.error('Error updating roles or nickname:', error.message);
        await interaction.editReply({
            content: `เกิดข้อผิดพลาด: ${error.message}`,
        });
    }
};

// เมื่อมี Interaction
client.on('interactionCreate', async (interaction) => {
    try {
        if (!interaction.isCommand() && !interaction.isModalSubmit() && !interaction.isStringSelectMenu()) return;

        if (interaction.commandName === 'register') {
            const modal = new ModalBuilder()
                .setCustomId('name-modal')
                .setTitle('ลงทะเบียน - กรอกชื่อ');

            const nameInput = new TextInputBuilder()
                .setCustomId('name-input')
                .setLabel('ชื่อของคุณ')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('กรุณาใส่ชื่อของคุณ')
                .setRequired(true);

            const actionRow = new ActionRowBuilder().addComponents(nameInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId === 'name-modal') {
            const name = interaction.fields.getTextInputValue('name-input');
            userData.set(interaction.user.id, { name, hasSelectedYear: false, hasSelectedRole: false, hasSelectedResetOrAdd: false });

            const yearSelect = new StringSelectMenuBuilder()
                .setCustomId('year-select')
                .setPlaceholder('เลือกชั้นปีของคุณ...')
                .addOptions(
                    config.years.map((year) => ({ label: year, value: year }))
                );

            const actionRowYear = new ActionRowBuilder().addComponents(yearSelect);

            await interaction.reply({
                content: 'กรุณาเลือกชั้นปีของคุณ:',
                components: [actionRowYear],
                ephemeral: true,
            });
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'year-select') {
            await interaction.deferReply({ ephemeral: true });

            const user = userData.get(interaction.user.id);
            if (!user) {
                await interaction.editReply({
                    content: 'ไม่พบข้อมูลผู้ใช้ กรุณาเริ่มต้นใหม่โดยใช้คำสั่ง /register',
                });
                return;
            }

            if (user.hasSelectedYear) {
                await interaction.editReply({
                    content: 'คุณได้เลือกชั้นปีไปแล้ว กรุณาเริ่มต้นใหม่โดยใช้คำสั่ง /register หากต้องการทำรายการใหม่',
                });
                return;
            }

            userData.set(interaction.user.id, { ...user, hasSelectedYear: true, year: interaction.values[0] });

            const roleSelect = new StringSelectMenuBuilder()
                .setCustomId('role-select')
                .setPlaceholder('เลือกตำแหน่งของคุณ...')
                .addOptions(
                    Object.keys(config.roles).map((role) => ({ label: role, value: role }))
                );

            const actionRowRole = new ActionRowBuilder().addComponents(roleSelect);

            await interaction.editReply({
                content: 'กรุณาเลือกตำแหน่งของคุณ:',
                components: [actionRowRole],
            });
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'role-select') {
            await interaction.deferReply({ ephemeral: true });

            const user = userData.get(interaction.user.id);
            if (!user) {
                await interaction.editReply({
                    content: 'ไม่พบข้อมูลผู้ใช้ กรุณาเริ่มต้นใหม่โดยใช้คำสั่ง /register',
                });
                return;
            }

            if (user.hasSelectedRole) {
                await interaction.editReply({
                    content: 'คุณได้เลือกตำแหน่งไปแล้ว กรุณาเริ่มต้นใหม่โดยใช้คำสั่ง /register หากต้องการทำรายการใหม่',
                });
                return;
            }

            const role = interaction.values[0];
            userData.set(interaction.user.id, { ...user, hasSelectedRole: true, role });

            const existingRoles = interaction.member.roles.cache.map((r) => r.name);
            const relevantRoles = Object.keys(config.roles).filter((r) => existingRoles.includes(r));

            if (relevantRoles.length > 0) {
                const resetOrAddMenu = new StringSelectMenuBuilder()
                    .setCustomId('reset-or-add')
                    .setPlaceholder('คุณต้องการรีเซ็ตตำแหน่งหรือเพิ่มใหม่?')
                    .addOptions([
                        { label: 'รีเซ็ตตำแหน่ง', value: 'reset' },
                        { label: 'เพิ่มตำแหน่ง', value: 'add' },
                    ]);

                const actionRowResetOrAdd = new ActionRowBuilder().addComponents(resetOrAddMenu);

                await interaction.editReply({
                    content: `คุณมีตำแหน่งอยู่แล้ว: ${relevantRoles.join(', ')}\nกรุณาเลือกว่าจะรีเซ็ตตำแหน่งหรือเพิ่มใหม่:`,
                    components: [actionRowResetOrAdd],
                });

                return;
            }

            await addRolesAndSetNickname(interaction, user, role);
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'reset-or-add') {
            await interaction.deferReply({ ephemeral: true });

            const user = userData.get(interaction.user.id);
            if (!user) {
                await interaction.editReply({
                    content: 'ไม่พบข้อมูลผู้ใช้ กรุณาเริ่มต้นใหม่โดยใช้คำสั่ง /register',
                });
                return;
            }

            if (user.hasSelectedResetOrAdd) {
                await interaction.editReply({
                    content: 'คุณได้เลือกในเมนูนี้ไปแล้ว กรุณาเริ่มต้นใหม่โดยใช้คำสั่ง /register หากต้องการทำรายการใหม่',
                });
                return;
            }

            userData.set(interaction.user.id, { ...user, hasSelectedResetOrAdd: true });

            const role = user.role;

            if (interaction.values[0] === 'reset') {
                await resetRoles(interaction); // ลบยศทั้งหมด
            }

            await addRolesAndSetNickname(interaction, user, role);
        }
    } catch (error) {
        console.error('Unhandled interaction error:', error);
    }
});

// ลบคำสั่งเก่าและลงทะเบียนใหม่
(async () => {
    await deleteCommands();
    await registerCommands();
})();

// จัดการ Errors ระดับ Global
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

// เข้าสู่ระบบ Bot
client.login(TOKEN);
