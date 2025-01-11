const { Client, GatewayIntentBits, StringSelectMenuBuilder, ActionRowBuilder, REST, Routes, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const config = require('./config.json'); 
require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const LOG_CHANNEL_ID = '1316890886264848475'; 

const userData = new Map();

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

let logQueue = [];
let isProcessingLogs = false;

const logToChannel = async (message) => {
    logQueue.push(message); 
    if (!isProcessingLogs) processLogsInBackground(); 
};

const processLogsInBackground = async () => {
    isProcessingLogs = true;

    while (logQueue.length > 0) {
        try {
            const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
            if (!logChannel) {
                console.error(`Log channel with ID ${LOG_CHANNEL_ID} not found.`);
                logQueue = []; 
                break;
            }

            const logMessage = logQueue.shift();
            await logChannel.send(logMessage);
        } catch (error) {
            console.error('Error sending log to channel:', error);
        }

        await new Promise((resolve) => setTimeout(resolve, 1000)); 
    }

    isProcessingLogs = false;
};


const deleteCommands = async () => {
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        console.log('Deleting all global and guild commands...');

        // ลบ Global Commands
        const globalCommands = await rest.get(Routes.applicationCommands(CLIENT_ID));
        for (const command of globalCommands) {
            console.log(`Deleting global command: ${command.name}`);
            await rest.delete(`${Routes.applicationCommands(CLIENT_ID)}/${command.id}`);
        }
        console.log('Deleted all global commands.');

        // ลบ Guild Commands
        const guildCommands = await rest.get(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID));
        for (const command of guildCommands) {
            console.log(`Deleting guild command: ${command.name}`);
            await rest.delete(`${Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)}/${command.id}`);
        }
        console.log('Deleted all guild commands.');
    } catch (error) {
        console.error('Error deleting commands:', error);
    }
};

const registerCommands = async () => {
    const commands = [
        {
            name: 'register',
            description: 'ลงทะเบียนข้อมูลส่วนตัว (ชื่อ, ชั้นปี, ตำแหน่ง)',
        },
        {
            name: 'gamerole',
            description: 'เลือก Role เกมที่คุณต้องการ',
        },
    ];

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
        console.log('Registering Guild Commands...');
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log('Guild commands registered successfully.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
};


client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    await logToChannel(`🚀 Bot is online as ${client.user.tag}!`);
});

const resetRoles = async (interaction) => {
    try {
        const rolesToRemove = interaction.member.roles.cache.filter(
            (role) => role.name !== '@everyone'
        );

        for (const role of rolesToRemove.values()) {
            await interaction.member.roles.remove(role);
        }

        console.log('All roles reset successfully.');
        await logToChannel(`✅ All roles reset for user ${interaction.user.tag}.`);
    } catch (error) {
        console.error('Error resetting roles:', error);
        await logToChannel(`❌ Error resetting roles for user ${interaction.user.tag}: ${error.message}`);
        throw new Error('เกิดข้อผิดพลาดในการรีเซ็ตยศ.');
    }
};

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
                await logToChannel(`⚠️ Role "${roleName}" not found in the server.`);
            }
        }

        const newName = `${user.name} ${user.year}`;
        await interaction.member.setNickname(newName);

        console.log(`Registration completed for ${interaction.user.tag}: Name=${user.name}, Year=${user.year}, Role=${role}`);
        await logToChannel(`✅ Registration completed for ${interaction.user.tag}: Name=${user.name}, Year=${user.year}, Role=${role}`);

        await interaction.editReply({
            content: `ลงทะเบียนสำเร็จ: ชื่อ: **${user.name}**, ชั้นปี: **${user.year}**, ตำแหน่ง: **${role}** พร้อมยศที่เกี่ยวข้อง: ${rolesToAdd.join(', ')}`,
        });
    } catch (error) {
        console.error('Error updating roles or nickname:', error.message);
        await logToChannel(`❌ Error updating roles or nickname for ${interaction.user.tag}: ${error.message}`);
        await interaction.editReply({
            content: `เกิดข้อผิดพลาด: ${error.message}`,
        });
    }
};

const handleGameRoleSelection = async (interaction, selectedRole) => {
    const gameRoles = config.gameroles; // ดึงรายชื่อเกมจาก config.json
    const relevantRoles = interaction.member.roles.cache.filter((role) => gameRoles.includes(role.name));

    if (relevantRoles.size > 0) {
        const resetOrAddMenu = new StringSelectMenuBuilder()
            .setCustomId('reset-or-add-gamerole')
            .setPlaceholder('คุณต้องการรีเซ็ตหรือเพิ่ม Role ใหม่?')
            .addOptions([
                { label: 'รีเซ็ต Role', value: 'reset' },
                { label: 'เพิ่ม Role ใหม่', value: 'add' },
            ]);

        const actionRowResetOrAdd = new ActionRowBuilder().addComponents(resetOrAddMenu);

        await interaction.editReply({
            content: `คุณมี Role เกมอยู่แล้ว: ${relevantRoles.map((r) => r.name).join(', ')}\nกรุณาเลือกว่าจะรีเซ็ตหรือเพิ่มใหม่:`,
            components: [actionRowResetOrAdd],
            ephemeral: true,
        });

        userData.set(interaction.user.id, { selectedRole, isGameRole: true });
    } else {
        await assignGameRole(interaction, selectedRole);
    }
};

const assignGameRole = async (interaction, roleName) => {
    try {
        const guildRole = interaction.guild.roles.cache.find((r) => r.name === roleName);

        if (guildRole) {
            await interaction.member.roles.add(guildRole);
            await interaction.editReply({
                content: `✅ คุณได้รับ Role **${roleName}** เรียบร้อยแล้ว!`,
                ephemeral: true,
            });
        } else {
            throw new Error(`Role "${roleName}" ไม่พบในเซิร์ฟเวอร์`);
        }
    } catch (error) {
        console.error('Error assigning game role:', error.message);
        await interaction.editReply({
            content: `❌ เกิดข้อผิดพลาด: ${error.message}`,
            ephemeral: true,
        });
    }
};

const checkRegisteredCommands = async () => {
    const rest = new REST({ version: '10' }).setToken(TOKEN);

    const globalCommands = await rest.get(Routes.applicationCommands(CLIENT_ID));
    console.log('Registered Global Commands:', globalCommands.map(cmd => cmd.name));

    const guildCommands = await rest.get(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID));
    console.log('Registered Guild Commands:', guildCommands.map(cmd => cmd.name));
};


client.on('interactionCreate', async (interaction) => {
    try {
        console.log(`Interaction triggered by ${interaction.user.tag}: ${interaction.customId || interaction.commandName}`);
        await logToChannel(`⚡ Interaction triggered by ${interaction.user.tag}: ${interaction.customId || interaction.commandName}`);

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
            await logToChannel(`📝 User ${interaction.user.tag} started registration with name: "${name}"`);
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'year-select') {
            await interaction.deferReply({ ephemeral: true });

            const user = userData.get(interaction.user.id);
            if (!user) {
                const message = 'ไม่พบข้อมูลผู้ใช้ กรุณาเริ่มต้นใหม่โดยใช้คำสั่ง /register';
                await interaction.editReply({ content: message });
                await logToChannel(`⚠️ User ${interaction.user.tag} tried to select year but no data found. Message: "${message}"`);
                return;
            }

            if (user.hasSelectedYear) {
                const message = 'คุณได้เลือกชั้นปีไปแล้ว กรุณาเริ่มต้นใหม่โดยใช้คำสั่ง /register';
                await interaction.editReply({ content: message });
                await logToChannel(`⚠️ User ${interaction.user.tag} tried to select year again. Message: "${message}"`);
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
            await logToChannel(`✅ User ${interaction.user.tag} selected year: "${interaction.values[0]}"`);
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'role-select') {
            await interaction.deferReply({ ephemeral: true });

            const user = userData.get(interaction.user.id);
            if (!user) {
                const message = 'ไม่พบข้อมูลผู้ใช้ กรุณาเริ่มต้นใหม่โดยใช้คำสั่ง /register';
                await interaction.editReply({ content: message });
                await logToChannel(`⚠️ User ${interaction.user.tag} tried to select role but no data found. Message: "${message}"`);
                return;
            }

            if (user.hasSelectedRole) {
                const message = 'คุณได้เลือกตำแหน่งไปแล้ว กรุณาเริ่มต้นใหม่โดยใช้คำสั่ง /register';
                await interaction.editReply({ content: message });
                await logToChannel(`⚠️ User ${interaction.user.tag} tried to select role again. Message: "${message}"`);
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

                const message = `คุณมีตำแหน่งอยู่แล้ว: ${relevantRoles.join(', ')}\nกรุณาเลือกว่าจะรีเซ็ตตำแหน่งหรือเพิ่มใหม่:`;
                await interaction.editReply({
                    content: message,
                    components: [actionRowResetOrAdd],
                });
                await logToChannel(`⚠️ User ${interaction.user.tag} has existing roles: "${relevantRoles.join(', ')}". Prompted to reset or add.`);
                return;
            }

            await addRolesAndSetNickname(interaction, user, role);
            await logToChannel(`✅ User ${interaction.user.tag} selected role: "${role}"`);
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'reset-or-add') {
            await interaction.deferReply({ ephemeral: true });

            const user = userData.get(interaction.user.id);
            if (!user) {
                const message = 'ไม่พบข้อมูลผู้ใช้ กรุณาเริ่มต้นใหม่โดยใช้คำสั่ง /register';
                await interaction.editReply({ content: message });
                await logToChannel(`⚠️ User ${interaction.user.tag} tried to reset/add role but no data found. Message: "${message}"`);
                return;
            }

            if (user.hasSelectedResetOrAdd) {
                const message = 'คุณได้เลือกในเมนูนี้ไปแล้ว กรุณาเริ่มต้นใหม่โดยใช้คำสั่ง /register';
                await interaction.editReply({ content: message });
                await logToChannel(`⚠️ User ${interaction.user.tag} tried to reset/add role again. Message: "${message}"`);
                return;
            }

            userData.set(interaction.user.id, { ...user, hasSelectedResetOrAdd: true });

            const role = user.role;

            if (interaction.values[0] === 'reset') {
                await resetRoles(interaction);
                await logToChannel(`🗑️ User ${interaction.user.tag} chose to reset roles.`);
            }

            await addRolesAndSetNickname(interaction, user, role);
        }

        if (interaction.commandName === 'gamerole') {
            const gameRoleMenu = new StringSelectMenuBuilder()
                .setCustomId('game-role-select')
                .setPlaceholder('เลือกเกมของคุณ...')
                .addOptions(
                    config.gameroles.map((game) => ({ label: game, value: game }))
                ); // ดึงชื่อเกมจาก config.gameroles

            const actionRowGameRole = new ActionRowBuilder().addComponents(gameRoleMenu);

            await interaction.reply({
                content: 'กรุณาเลือกเกมที่คุณต้องการ:',
                components: [actionRowGameRole],
                ephemeral: true,
            });
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'game-role-select') {
            const selectedRole = interaction.values[0];
            await interaction.deferReply({ ephemeral: true }); // เพิ่มการ defer
            await handleGameRoleSelection(interaction, selectedRole);
        }
        
        if (interaction.isStringSelectMenu() && interaction.customId === 'reset-or-add-gamerole') {
            const user = userData.get(interaction.user.id);
            if (!user || !user.isGameRole) {
                await interaction.editReply({
                    content: 'ไม่พบข้อมูลผู้ใช้ กรุณาเริ่มต้นใหม่โดยใช้คำสั่ง /gamerole',
                    ephemeral: true,
                });
                return;
            }
        
            await interaction.deferReply({ ephemeral: true }); // เพิ่มการ defer
            if (interaction.values[0] === 'reset') {
                const gameRoles = config.gameroles; // ดึงรายชื่อเกมจาก config.json
                const rolesToRemove = interaction.member.roles.cache.filter((role) => gameRoles.includes(role.name));
        
                for (const role of rolesToRemove.values()) {
                    await interaction.member.roles.remove(role);
                }
        
                await interaction.editReply({
                    content: '✅ Role เก่าถูกรีเซ็ตเรียบร้อยแล้ว!',
                    ephemeral: true,
                });
            }
        
            await assignGameRole(interaction, user.selectedRole);
        }
        
    } catch (error) {
        console.error('Unhandled interaction error:', error);
        await logToChannel(`❌ Unhandled interaction error: ${error.message}`);
    }
});

(async () => {
    await deleteCommands();
    await checkRegisteredCommands(); // ตรวจสอบคำสั่งใหม่
    await registerCommands();
})();

process.on('unhandledRejection', async (error) => {
    console.error('Unhandled promise rejection:', error);
    await logToChannel(`❌ Unhandled promise rejection: ${error.message}`);
});

process.on('uncaughtException', async (error) => {
    console.error('Uncaught exception:', error);
    await logToChannel(`❌ Uncaught exception: ${error.message}`);
});

client.login(TOKEN);
