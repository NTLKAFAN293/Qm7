require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const Database = require('better-sqlite3');
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const db = new Database('bot.db');

// إنشاء جدول إعدادات التكتات مع حفظ رسالة الترحيب وروم اللوق
db.exec(`
    CREATE TABLE IF NOT EXISTS ticket_system1 (
        guild_id TEXT PRIMARY KEY,
        support_role_id TEXT,
        ticket_counter INTEGER DEFAULT 0,
        category_id TEXT,
        welcome_message TEXT,
        log_channel_id TEXT
    );

    CREATE TABLE IF NOT EXISTS ticket_system2 (
        guild_id TEXT PRIMARY KEY,
        support_role_id TEXT,
        ticket_counter INTEGER DEFAULT 0,
        category_id TEXT,
        welcome_message TEXT,
        log_channel_id TEXT
    );

    CREATE TABLE IF NOT EXISTS tax_channels (
        guild_id TEXT PRIMARY KEY,
        channel_id TEXT
    );
`);

const commands = [
    new SlashCommandBuilder()
        .setName('تكت-اعضاء')
        .setDescription('نظام تكتات الأعضاء')
        .addChannelOption(option =>
            option.setName('الروم')
                .setDescription('الروم الذي سيرسل فيه الإيمبد')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('الكاتيجوري')
                .setDescription('الكاتيجوري الذي ستفتح فيه التكتات')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('العنوان')
                .setDescription('عنوان الإيمبد')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('الوصف')
                .setDescription('وصف الإيمبد')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('رسالة_الترحيب')
                .setDescription('رسالة الترحيب في التكت')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('الصورة')
                .setDescription('رابط الصورة (اختياري)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('رتبة-دعم-اعضاء')
        .setDescription('تحديد رتبة الدعم لتكتات الأعضاء')
        .addRoleOption(option =>
            option.setName('الرتبة')
                .setDescription('رتبة الدعم')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('تكت-ثاني')
        .setDescription('نظام تكتات ثاني')
        .addChannelOption(option =>
            option.setName('الروم')
                .setDescription('الروم الذي سيرسل فيه الإيمبد')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('الكاتيجوري')
                .setDescription('الكاتيجوري الذي ستفتح فيه التكتات')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('العنوان')
                .setDescription('عنوان الإيمبد')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('الوصف')
                .setDescription('وصف الإيمبد')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('رسالة_الترحيب')
                .setDescription('رسالة الترحيب في التكت')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('الصورة')
                .setDescription('رابط الصورة (اختياري)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('رتبة-دعم-ثاني')
        .setDescription('تحديد رتبة الدعم للنظام الثاني')
        .addRoleOption(option =>
            option.setName('الرتبة')
                .setDescription('رتبة الدعم')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('لوق-التكتات')
        .setDescription('تحديد روم لوق التكتات')
        .addStringOption(option =>
            option.setName('النظام')
                .setDescription('اختر النظام')
                .setRequired(true)
                .addChoices(
                    { name: 'نظام الأعضاء', value: 'system1' },
                    { name: 'النظام الثاني', value: 'system2' }
                ))
        .addChannelOption(option =>
            option.setName('الروم')
                .setDescription('روم اللوق')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('روم-الضريبة')
        .setDescription('تحديد روم حساب الضريبة')
        .addChannelOption(option =>
            option.setName('الروم')
                .setDescription('الروم الذي سيتم فيه حساب الضريبة')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

// إنشاء خادم HTTP بسيط
const PORT = 3000; // يمكنك تغيير الرقم هنا
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Discord Bot is running!');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`خادم HTTP يعمل على المنفذ ${PORT}`);
});

// دالة لإرسال لوق
async function sendLog(guildId, systemTable, content, executor) {
    const stmt = db.prepare(`SELECT log_channel_id FROM ${systemTable} WHERE guild_id = ?`);
    const settings = stmt.get(guildId);

    if (settings && settings.log_channel_id) {
        try {
            const guild = client.guilds.cache.get(guildId);
            const logChannel = guild.channels.cache.get(settings.log_channel_id);

            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setDescription(`${content}\n**بواسطة:** ${executor}`)
                    .setColor('#5865F2')
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }
        } catch (error) {
            console.error('خطأ في إرسال اللوق:', error);
        }
    }
}

// دالة لحساب الضريبة
function calculateProBotTax(amount) {
    return Math.floor(amount * (20 / 19)) + 1;
}

function calculateMediator(amount) {
    return Math.floor(amount * 1.05) + 1;
}

function calculateRobuxTax(amount) {
    return Math.floor(amount / 0.7) + 1;
}

client.once('ready', async () => {
    console.log(`بوت التكتات جاهز: ${client.user.tag}`);

    try {
        // إضافة الأوامر
        await client.application.commands.set(commands);
        console.log('أوامر التكتات تم تسجيلها بنجاح');
    } catch (error) {
        console.error('خطأ في تسجيل الأوامر:', error);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        if (commandName === 'تكت-اعضاء') {
            const channel = interaction.options.getChannel('الروم');
            const category = interaction.options.getChannel('الكاتيجوري');
            const title = interaction.options.getString('العنوان');
            const description = interaction.options.getString('الوصف');
            const welcomeMsg = interaction.options.getString('رسالة_الترحيب');
            const image = interaction.options.getString('الصورة');

            try {
                const embed = new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(description)
                    .setColor('#5865F2');

                if (image) {
                    embed.setImage(image);
                }

                const button = new ButtonBuilder()
                    .setCustomId('open_ticket_system1')
                    .setLabel('فتح تكت')
                    .setStyle(ButtonStyle.Primary);

                const row = new ActionRowBuilder().addComponents(button);

                await channel.send({ embeds: [embed], components: [row] });

                const stmt = db.prepare('INSERT OR REPLACE INTO ticket_system1 (guild_id, support_role_id, ticket_counter, category_id, welcome_message, log_channel_id) VALUES (?, COALESCE((SELECT support_role_id FROM ticket_system1 WHERE guild_id = ?), NULL), COALESCE((SELECT ticket_counter FROM ticket_system1 WHERE guild_id = ?), 0), ?, ?, COALESCE((SELECT log_channel_id FROM ticket_system1 WHERE guild_id = ?), NULL))');
                stmt.run(interaction.guildId, interaction.guildId, interaction.guildId, category.id, welcomeMsg, interaction.guildId);

                await interaction.reply({ content: `تم إرسال نظام التكتات بنجاح!`, ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'صار خطأ', ephemeral: true });
            }
        }

        if (commandName === 'رتبة-دعم-اعضاء') {
            const role = interaction.options.getRole('الرتبة');

            try {
                const stmt = db.prepare('INSERT OR REPLACE INTO ticket_system1 (guild_id, support_role_id, ticket_counter, category_id, welcome_message, log_channel_id) VALUES (?, ?, COALESCE((SELECT ticket_counter FROM ticket_system1 WHERE guild_id = ?), 0), COALESCE((SELECT category_id FROM ticket_system1 WHERE guild_id = ?), NULL), COALESCE((SELECT welcome_message FROM ticket_system1 WHERE guild_id = ?), NULL), COALESCE((SELECT log_channel_id FROM ticket_system1 WHERE guild_id = ?), NULL))');
                stmt.run(interaction.guildId, role.id, interaction.guildId, interaction.guildId, interaction.guildId, interaction.guildId);

                await interaction.reply({ content: `تم تحديد <@&${role.id}> كرتبة دعم`, ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'صار خطأ', ephemeral: true });
            }
        }

        if (commandName === 'تكت-ثاني') {
            const channel = interaction.options.getChannel('الروم');
            const category = interaction.options.getChannel('الكاتيجوري');
            const title = interaction.options.getString('العنوان');
            const description = interaction.options.getString('الوصف');
            const welcomeMsg = interaction.options.getString('رسالة_الترحيب');
            const image = interaction.options.getString('الصورة');

            try {
                const embed = new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(description)
                    .setColor('#5865F2');

                if (image) {
                    embed.setImage(image);
                }

                const button = new ButtonBuilder()
                    .setCustomId('open_ticket_system2')
                    .setLabel('فتح تكت')
                    .setStyle(ButtonStyle.Primary);

                const row = new ActionRowBuilder().addComponents(button);

                await channel.send({ embeds: [embed], components: [row] });

                const stmt = db.prepare('INSERT OR REPLACE INTO ticket_system2 (guild_id, support_role_id, ticket_counter, category_id, welcome_message, log_channel_id) VALUES (?, COALESCE((SELECT support_role_id FROM ticket_system2 WHERE guild_id = ?), NULL), COALESCE((SELECT ticket_counter FROM ticket_system2 WHERE guild_id = ?), 0), ?, ?, COALESCE((SELECT log_channel_id FROM ticket_system2 WHERE guild_id = ?), NULL))');
                stmt.run(interaction.guildId, interaction.guildId, interaction.guildId, category.id, welcomeMsg, interaction.guildId);

                await interaction.reply({ content: `تم إرسال نظام التكتات بنجاح!`, ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'صار خطأ', ephemeral: true });
            }
        }

        if (commandName === 'رتبة-دعم-ثاني') {
            const role = interaction.options.getRole('الرتبة');

            try {
                const stmt = db.prepare('INSERT OR REPLACE INTO ticket_system2 (guild_id, support_role_id, ticket_counter, category_id, welcome_message, log_channel_id) VALUES (?, ?, COALESCE((SELECT ticket_counter FROM ticket_system2 WHERE guild_id = ?), 0), COALESCE((SELECT category_id FROM ticket_system2 WHERE guild_id = ?), NULL), COALESCE((SELECT welcome_message FROM ticket_system2 WHERE guild_id = ?), NULL), COALESCE((SELECT log_channel_id FROM ticket_system2 WHERE guild_id = ?), NULL))');
                stmt.run(interaction.guildId, role.id, interaction.guildId, interaction.guildId, interaction.guildId, interaction.guildId);

                await interaction.reply({ content: `تم تحديد <@&${role.id}> كرتبة دعم`, ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'صار خطأ', ephemeral: true });
            }
        }

        if (commandName === 'لوق-التكتات') {
            const system = interaction.options.getString('النظام');
            const logChannel = interaction.options.getChannel('الروم');

            try {
                const systemTable = system === 'system1' ? 'ticket_system1' : 'ticket_system2';
                const stmt = db.prepare(`INSERT OR REPLACE INTO ${systemTable} (guild_id, support_role_id, ticket_counter, category_id, welcome_message, log_channel_id) VALUES (?, COALESCE((SELECT support_role_id FROM ${systemTable} WHERE guild_id = ?), NULL), COALESCE((SELECT ticket_counter FROM ${systemTable} WHERE guild_id = ?), 0), COALESCE((SELECT category_id FROM ${systemTable} WHERE guild_id = ?), NULL), COALESCE((SELECT welcome_message FROM ${systemTable} WHERE guild_id = ?), NULL), ?)`);
                stmt.run(interaction.guildId, interaction.guildId, interaction.guildId, interaction.guildId, interaction.guildId, logChannel.id);

                await interaction.reply({ content: `تم تحديد <#${logChannel.id}> كروم لوق التكتات`, ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'صار خطأ', ephemeral: true });
            }
        }

        if (commandName === 'روم-الضريبة') {
            const channel = interaction.options.getChannel('الروم');

            try {
                const stmt = db.prepare('INSERT OR REPLACE INTO tax_channels (guild_id, channel_id) VALUES (?, ?)');
                stmt.run(interaction.guildId, channel.id);

                await interaction.reply({ content: `تــم تــحــديــد <#${channel.id}> كــروم حــســاب الــضــريــبــة`, ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'صــار خــطــأ', ephemeral: true });
            }
        }
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'open_ticket_system1') {
            const stmt = db.prepare('SELECT * FROM ticket_system1 WHERE guild_id = ?');
            const settings = stmt.get(interaction.guildId);

            if (!settings || !settings.support_role_id) {
                return interaction.reply({ content: 'لم يتم تحديد رتبة الدعم بعد', ephemeral: true });
            }

            try {
                const updateStmt = db.prepare('UPDATE ticket_system1 SET ticket_counter = ticket_counter + 1 WHERE guild_id = ?');
                updateStmt.run(interaction.guildId);

                const counterStmt = db.prepare('SELECT ticket_counter FROM ticket_system1 WHERE guild_id = ?');
                const counter = counterStmt.get(interaction.guildId).ticket_counter;

                const ticketChannel = await interaction.guild.channels.create({
                    name: `ticket-${counter}`,
                    type: ChannelType.GuildText,
                    parent: settings.category_id,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.id,
                            deny: [PermissionFlagsBits.ViewChannel]
                        },
                        {
                            id: interaction.user.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                        },
                        {
                            id: settings.support_role_id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                        }
                    ]
                });

                const welcomeEmbed = new EmbedBuilder()
                    .setDescription(settings.welcome_message || `مرحباً <@${interaction.user.id}>!\nفريق الدعم سيرد عليك قريباً`)
                    .setColor('#5865F2');

                const closeButton = new ButtonBuilder()
                    .setCustomId(`close_ticket_system1_${ticketChannel.id}_${interaction.user.id}`)
                    .setLabel('قفل')
                    .setStyle(ButtonStyle.Danger);

                const row = new ActionRowBuilder().addComponents(closeButton);

                await ticketChannel.send({ content: `<@&${settings.support_role_id}>`, embeds: [welcomeEmbed], components: [row] });
                await interaction.reply({ content: `تم فتح تكت: <#${ticketChannel.id}>`, ephemeral: true });

                await sendLog(interaction.guildId, 'ticket_system1', `تم فتح التكت <#${ticketChannel.id}>`, `<@${interaction.user.id}>`);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'صار خطأ', ephemeral: true });
            }
        }

        if (interaction.customId === 'open_ticket_system2') {
            const stmt = db.prepare('SELECT * FROM ticket_system2 WHERE guild_id = ?');
            const settings = stmt.get(interaction.guildId);

            if (!settings || !settings.support_role_id) {
                return interaction.reply({ content: 'لم يتم تحديد رتبة الدعم بعد', ephemeral: true });
            }

            try {
                const updateStmt = db.prepare('UPDATE ticket_system2 SET ticket_counter = ticket_counter + 1 WHERE guild_id = ?');
                updateStmt.run(interaction.guildId);

                const counterStmt = db.prepare('SELECT ticket_counter FROM ticket_system2 WHERE guild_id = ?');
                const counter = counterStmt.get(interaction.guildId).ticket_counter;

                const ticketChannel = await interaction.guild.channels.create({
                    name: `ticket-${counter}`,
                    type: ChannelType.GuildText,
                    parent: settings.category_id,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.id,
                            deny: [PermissionFlagsBits.ViewChannel]
                        },
                        {
                            id: interaction.user.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                        },
                        {
                            id: settings.support_role_id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                        }
                    ]
                });

                const welcomeEmbed = new EmbedBuilder()
                    .setDescription(settings.welcome_message || `مرحباً <@${interaction.user.id}>!\nفريق الدعم سيرد عليك قريباً`)
                    .setColor('#5865F2');

                const closeButton = new ButtonBuilder()
                    .setCustomId(`close_ticket_system2_${ticketChannel.id}_${interaction.user.id}`)
                    .setLabel('قفل')
                    .setStyle(ButtonStyle.Danger);

                const row = new ActionRowBuilder().addComponents(closeButton);

                await ticketChannel.send({ content: `<@&${settings.support_role_id}>`, embeds: [welcomeEmbed], components: [row] });
                await interaction.reply({ content: `تم فتح تكت: <#${ticketChannel.id}>`, ephemeral: true });

                await sendLog(interaction.guildId, 'ticket_system2', `تم فتح التكت <#${ticketChannel.id}>`, `<@${interaction.user.id}>`);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'صار خطأ', ephemeral: true });
            }
        }

        if (interaction.customId.startsWith('close_ticket_system1_')) {
            const parts = interaction.customId.split('_');
            const ticketId = parts[3];
            const ownerId = parts[4];

            if (interaction.user.id === ownerId) {
                return interaction.reply({ content: 'لا يمكنك قفل التكت الخاص بك', ephemeral: true });
            }

            const stmt = db.prepare('SELECT support_role_id FROM ticket_system1 WHERE guild_id = ?');
            const settings = stmt.get(interaction.guildId);

            if (!interaction.member.roles.cache.has(settings.support_role_id)) {
                return interaction.reply({ content: 'لا تملك صلاحية قفل التكت', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('تم قفل التكت')
                .setDescription('هل تريد حذفه؟')
                .setColor('#FFA500');

            const deleteButton = new ButtonBuilder()
                .setCustomId(`delete_ticket_system1_${ticketId}`)
                .setLabel('حذف')
                .setStyle(ButtonStyle.Danger);

            const reopenButton = new ButtonBuilder()
                .setCustomId(`reopen_ticket_system1_${ticketId}_${ownerId}`)
                .setLabel('فتح')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder().addComponents(deleteButton, reopenButton);

            await interaction.reply({ embeds: [embed], components: [row] });

            await sendLog(interaction.guildId, 'ticket_system1', `تم قفل التكت <#${ticketId}>`, `<@${interaction.user.id}>`);
        }

        if (interaction.customId.startsWith('close_ticket_system2_')) {
            const parts = interaction.customId.split('_');
            const ticketId = parts[3];
            const ownerId = parts[4];

            if (interaction.user.id === ownerId) {
                return interaction.reply({ content: 'لا يمكنك قفل التكت الخاص بك', ephemeral: true });
            }

            const stmt = db.prepare('SELECT support_role_id FROM ticket_system2 WHERE guild_id = ?');
            const settings = stmt.get(interaction.guildId);

            if (!interaction.member.roles.cache.has(settings.support_role_id)) {
                return interaction.reply({ content: 'لا تملك صلاحية قفل التكت', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('تم قفل التكت')
                .setDescription('هل تريد حذفه؟')
                .setColor('#FFA500');

            const deleteButton = new ButtonBuilder()
                .setCustomId(`delete_ticket_system2_${ticketId}`)
                .setLabel('حذف')
                .setStyle(ButtonStyle.Danger);

            const reopenButton = new ButtonBuilder()
                .setCustomId(`reopen_ticket_system2_${ticketId}_${ownerId}`)
                .setLabel('فتح')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder().addComponents(deleteButton, reopenButton);

            await interaction.reply({ embeds: [embed], components: [row] });

            await sendLog(interaction.guildId, 'ticket_system2', `تم قفل التكت <#${ticketId}>`, `<@${interaction.user.id}>`);
        }

        if (interaction.customId.startsWith('delete_ticket_system1_')) {
            const ticketId = interaction.customId.split('_')[3];
            const channel = interaction.guild.channels.cache.get(ticketId);

            try {
                await sendLog(interaction.guildId, 'ticket_system1', `تم حذف التكت #${channel.name}`, `<@${interaction.user.id}>`);
                await channel.delete();
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'صار خطأ', ephemeral: true });
            }
        }

        if (interaction.customId.startsWith('delete_ticket_system2_')) {
            const ticketId = interaction.customId.split('_')[3];
            const channel = interaction.guild.channels.cache.get(ticketId);

            try {
                await sendLog(interaction.guildId, 'ticket_system2', `تم حذف التكت #${channel.name}`, `<@${interaction.user.id}>`);
                await channel.delete();
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'صار خطأ', ephemeral: true });
            }
        }

        if (interaction.customId.startsWith('reopen_ticket_system1_')) {
            const parts = interaction.customId.split('_');
            const ticketId = parts[3];
            const ownerId = parts[4];

            const closeButton = new ButtonBuilder()
                .setCustomId(`close_ticket_system1_${ticketId}_${ownerId}`)
                .setLabel('قفل')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(closeButton);

            const embed = new EmbedBuilder()
                .setDescription(`تم إعادة فتح التكت`)
                .setColor('#00FF00');

            await interaction.update({ embeds: [embed], components: [row] });

            await sendLog(interaction.guildId, 'ticket_system1', `تم إعادة فتح التكت <#${ticketId}>`, `<@${interaction.user.id}>`);
        }

        if (interaction.customId.startsWith('reopen_ticket_system2_')) {
            const parts = interaction.customId.split('_');
            const ticketId = parts[3];
            const ownerId = parts[4];

            const closeButton = new ButtonBuilder()
                .setCustomId(`close_ticket_system2_${ticketId}_${ownerId}`)
                .setLabel('قفل')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(closeButton);

            const embed = new EmbedBuilder()
                .setDescription(`تم إعادة فتح التكت`)
                .setColor('#00FF00');

            await interaction.update({ embeds: [embed], components: [row] });

            await sendLog(interaction.guildId, 'ticket_system2', `تم إعادة فتح التكت <#${ticketId}>`, `<@${interaction.user.id}>`);
        }

        if (interaction.customId.startsWith('robux_tax_')) {
            const parts = interaction.customId.split('_');
            const amount = parseInt(parts[2]);
            const ownerId = parts[3];

            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: 'مــــالـك دخـــل بـــضـــريــبـــة غـــيـــرك <:1000060784:1424450317352833147>', ephemeral: true });
            }

            const robuxTax = calculateRobuxTax(amount);

            const embed = new EmbedBuilder()
                .setTitle('ضــــريــــبــــة روبـــــوكـــــس <:1000060493:1424328198367219786>')
                .setDescription(`\`\`\`${robuxTax}\`\`\``)
                .setColor('#5865F2');

            const proBotButton = new ButtonBuilder()
                .setCustomId(`probot_tax_${amount}_${ownerId}`)
                .setEmoji('<:1000060494:1424328179497046107>')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(proBotButton);

            await interaction.update({ embeds: [embed], components: [row] });
        }

        if (interaction.customId.startsWith('probot_tax_')) {
            const parts = interaction.customId.split('_');
            const amount = parseInt(parts[2]);
            const ownerId = parts[3];

            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: 'مــــالـك دخـــل بـــضـــريــبـــة غـــيـــرك <:1000060784:1424450317352833147>', ephemeral: true });
            }

            const proBotTax = calculateProBotTax(amount);
            const mediatorTax = calculateMediator(amount);

            const embed = new EmbedBuilder()
                .setTitle('ضــــريــــبــــة الــــبــــروبــــوت <:1000060494:1424328179497046107>')
                .setDescription(`\`\`\`${proBotTax}\`\`\`\n\nضــــريــــبــــة الــــوســــيــــط <a:1000060667:1424328144860614757>\n\`\`\`${mediatorTax}\`\`\``)
                .setColor('#5865F2');

            const robuxButton = new ButtonBuilder()
                .setCustomId(`robux_tax_${amount}_${ownerId}`)
                .setEmoji('<:1000060493:1424328198367219786>')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(robuxButton);

            await interaction.update({ embeds: [embed], components: [row] });
        }
    }
});

// التعامل مع الرسائل لحساب الضريبة
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const stmt = db.prepare('SELECT channel_id FROM tax_channels WHERE guild_id = ?');
    const taxChannel = stmt.get(message.guildId);

    if (!taxChannel || message.channelId !== taxChannel.channel_id) return;

    let amountStr = message.content.trim().toLowerCase();
    let amount = 0;

    // تحويل الأرقام الكبيرة
    if (amountStr.includes('b')) {
        // مليار (billion)
        const num = parseFloat(amountStr.replace('b', ''));
        amount = Math.floor(num * 1000000000);
    } else if (amountStr.includes('m')) {
        // مليون (million)
        const num = parseFloat(amountStr.replace('m', ''));
        amount = Math.floor(num * 1000000);
    } else if (amountStr.includes('k')) {
        // ألف (thousand)
        const num = parseFloat(amountStr.replace('k', ''));
        amount = Math.floor(num * 1000);
    } else {
        amount = parseInt(amountStr);
    }

    if (isNaN(amount) || amount <= 0) return;

    const proBotTax = calculateProBotTax(amount);
    const mediatorTax = calculateMediator(amount);

    const embed = new EmbedBuilder()
        .setTitle('ضــــريــــبــــة الــــبــــروبــــوت <:1000060494:1424328179497046107>')
        .setDescription(`\`\`\`${proBotTax}\`\`\`\n\nضــــريــــبــــة الــــوســــيــــط <a:1000060667:1424328144860614757>\n\`\`\`${mediatorTax}\`\`\``)
        .setColor('#5865F2');

    const robuxButton = new ButtonBuilder()
        .setCustomId(`robux_tax_${amount}_${message.author.id}`)
        .setEmoji('<:1000060493:1424328198367219786>')
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(robuxButton);

    await message.reply({ embeds: [embed], components: [row] });
});

client.login(process.env.DISCORD_TOKEN);
