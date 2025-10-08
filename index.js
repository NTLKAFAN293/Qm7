
require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const Database = require('better-sqlite3');
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: ['CHANNEL']
});

const db = new Database('bot.db');

// إنشاء الجداول
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

    CREATE TABLE IF NOT EXISTS active_tickets (
        channel_id TEXT PRIMARY KEY,
        guild_id TEXT,
        owner_id TEXT,
        claimer_id TEXT,
        system TEXT
    );

    CREATE TABLE IF NOT EXISTS user_gold (
        user_id TEXT PRIMARY KEY,
        guild_id TEXT,
        gold INTEGER DEFAULT 0,
        message_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tax_channels (
        guild_id TEXT PRIMARY KEY,
        channel_id TEXT
    );

    CREATE TABLE IF NOT EXISTS applications (
        user_id TEXT PRIMARY KEY,
        guild_id TEXT,
        answers TEXT,
        status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS button_messages (
        message_id TEXT PRIMARY KEY,
        guild_id TEXT,
        buttons_data TEXT
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
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('تقديم')
        .setDescription('إرسال نظام التقديم على الإدارة')
        .addChannelOption(option =>
            option.setName('الروم')
                .setDescription('الروم الذي سيرسل فيه الإيمبد')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('ارسال-رسالة')
        .setDescription('إرسال رسالة بإيمبد مع أزرار')
        .addChannelOption(option =>
            option.setName('الروم')
                .setDescription('الروم الذي سترسل فيه الرسالة')
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
            option.setName('الازرار')
                .setDescription('أسماء الأزرار مفصولة بـ /')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('الرسائل')
                .setDescription('رسائل الأزرار مفصولة بـ /')
                .setRequired(true))
        .addAttachmentOption(option =>
            option.setName('الصورة')
                .setDescription('صورة الإيمبد (اختياري)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('ارسال-خاص')
        .setDescription('إرسال رسائل خاصة')
        .addIntegerOption(option =>
            option.setName('عدد_الاعضاء')
                .setDescription('عدد الأعضاء العشوائيين')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('الاعضاء')
                .setDescription('أيدي الأعضاء مفصولة بـ ,')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('ملف_الاعضاء')
                .setDescription('ملف يحتوي على أيدي الأعضاء')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('رسالة1')
                .setDescription('الرسالة الأولى')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('رسالة2')
                .setDescription('الرسالة الثانية')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('رسالة3')
                .setDescription('الرسالة الثالثة')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('رسالة4')
                .setDescription('الرسالة الرابعة')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('رسالة5')
                .setDescription('الرسالة الخامسة')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('منشن')
                .setDescription('هل تريد منشن الأعضاء؟')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Discord Bot is running!');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`خادم HTTP يعمل على المنفذ ${PORT}`);
});

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

function calculateProBotTax(amount) {
    return Math.floor(amount * (20 / 19)) + 1;
}

function calculateMediator(amount) {
    return Math.floor(amount * 1.05) + 1;
}

function calculateRobuxTax(amount) {
    return Math.floor(amount / 0.7) + 1;
}

async function checkLevel10(guild, userId) {
    try {
        const levelChannel = await guild.channels.fetch('1423420809203941568');
        if (!levelChannel) return false;

        const messages = await levelChannel.messages.fetch({ limit: 100 });
        const userLevelMessage = messages.find(msg => 
            msg.content.includes(`<@${userId}>`) && 
            msg.content.includes('10')
        );

        return !!userLevelMessage;
    } catch (error) {
        console.error('خطأ في التحقق من اللفل:', error);
        return false;
    }
}

const applicationStates = new Map();

client.once('ready', async () => {
    console.log(`البوت جاهز: ${client.user.tag}`);

    try {
        await client.application.commands.set(commands);
        console.log('الأوامر تم تسجيلها بنجاح');
    } catch (error) {
        console.error('خطأ في تسجيل الأوامر:', error);
    }
});

// نظام الذهب - إضافة ذهب عند إرسال رسائل
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    try {
        const stmt = db.prepare('INSERT OR IGNORE INTO user_gold (user_id, guild_id, gold, message_count) VALUES (?, ?, 0, 0)');
        stmt.run(message.author.id, message.guild.id);

        const updateStmt = db.prepare('UPDATE user_gold SET message_count = message_count + 1 WHERE user_id = ? AND guild_id = ?');
        updateStmt.run(message.author.id, message.guild.id);

        const getStmt = db.prepare('SELECT message_count FROM user_gold WHERE user_id = ? AND guild_id = ?');
        const userData = getStmt.get(message.author.id, message.guild.id);

        if (userData && userData.message_count % 23 === 0) {
            const addGoldStmt = db.prepare('UPDATE user_gold SET gold = gold + 3 WHERE user_id = ? AND guild_id = ?');
            addGoldStmt.run(message.author.id, message.guild.id);
        }

        // أوامر الذهب
        const content = message.content.toLowerCase();
        
        if (content === 'g' || content === 'G') {
            const goldStmt = db.prepare('SELECT gold FROM user_gold WHERE user_id = ? AND guild_id = ?');
            const userGold = goldStmt.get(message.author.id, message.guild.id);
            await message.reply(`لديك **${userGold?.gold || 0}** ذهبية`);
        }

        const mentionMatch = content.match(/^g\s+<@!?(\d+)>$/);
        if (mentionMatch) {
            const targetId = mentionMatch[1];
            const goldStmt = db.prepare('SELECT gold FROM user_gold WHERE user_id = ? AND guild_id = ?');
            const targetGold = goldStmt.get(targetId, message.guild.id);
            await message.reply(`لدى <@${targetId}> **${targetGold?.gold || 0}** ذهبية`);
        }

        const transferMatch = content.match(/^g\s+<@!?(\d+)>\s+(\d+)$/);
        if (transferMatch) {
            const targetId = transferMatch[1];
            const amount = parseInt(transferMatch[2]);

            const senderStmt = db.prepare('SELECT gold FROM user_gold WHERE user_id = ? AND guild_id = ?');
            const senderGold = senderStmt.get(message.author.id, message.guild.id);

            if (!senderGold || senderGold.gold < amount) {
                return message.reply('ليس لديك ذهب كافٍ!');
            }

            const removeStmt = db.prepare('UPDATE user_gold SET gold = gold - ? WHERE user_id = ? AND guild_id = ?');
            removeStmt.run(amount, message.author.id, message.guild.id);

            const addStmt = db.prepare('INSERT OR IGNORE INTO user_gold (user_id, guild_id, gold, message_count) VALUES (?, ?, 0, 0)');
            addStmt.run(targetId, message.guild.id);

            const transferStmt = db.prepare('UPDATE user_gold SET gold = gold + ? WHERE user_id = ? AND guild_id = ?');
            transferStmt.run(amount, targetId, message.guild.id);

            await message.reply(`تم تحويل **${amount}** ذهبية إلى <@${targetId}>`);
        }
    } catch (error) {
        console.error('خطأ في نظام الذهب:', error);
    }

    // نظام الضريبة
    const taxStmt = db.prepare('SELECT channel_id FROM tax_channels WHERE guild_id = ?');
    const taxChannel = taxStmt.get(message.guild.id);

    if (taxChannel && message.channel.id === taxChannel.channel_id) {
        const amount = parseInt(message.content.replace(/,/g, ''));
        
        if (!isNaN(amount)) {
            const probot = calculateProBotTax(amount);
            const mediator = calculateMediator(amount);
            const robux = calculateRobuxTax(amount);

            const embed = new EmbedBuilder()
                .setTitle('حساب الضريبة')
                .addFields(
                    { name: 'ProBot', value: `\`${probot.toLocaleString()}\``, inline: true },
                    { name: 'Mediator', value: `\`${mediator.toLocaleString()}\``, inline: true },
                    { name: 'Robux', value: `\`${robux.toLocaleString()}\``, inline: true }
                )
                .setColor('#5865F2')
                .setFooter({ text: `المبلغ الأصلي: ${amount.toLocaleString()}` });

            await message.reply({ embeds: [embed] });
        }
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

                if (image) embed.setImage(image);

                const button = new ButtonBuilder()
                    .setCustomId('open_ticket_system1')
                    .setLabel('فتح تكت')
                    .setStyle(ButtonStyle.Primary);

                const row = new ActionRowBuilder().addComponents(button);

                await channel.send({ embeds: [embed], components: [row] });

                const stmt = db.prepare('INSERT OR REPLACE INTO ticket_system1 (guild_id, support_role_id, ticket_counter, category_id, welcome_message, log_channel_id) VALUES (?, COALESCE((SELECT support_role_id FROM ticket_system1 WHERE guild_id = ?), NULL), COALESCE((SELECT ticket_counter FROM ticket_system1 WHERE guild_id = ?), 0), ?, ?, COALESCE((SELECT log_channel_id FROM ticket_system1 WHERE guild_id = ?), NULL))');
                stmt.run(interaction.guildId, interaction.guildId, interaction.guildId, category.id, welcomeMsg, interaction.guildId);

                await interaction.reply({ content: 'تم إرسال نظام التكتات بنجاح!', ephemeral: true });
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

                if (image) embed.setImage(image);

                const button = new ButtonBuilder()
                    .setCustomId('open_ticket_system2')
                    .setLabel('فتح تكت')
                    .setStyle(ButtonStyle.Primary);

                const row = new ActionRowBuilder().addComponents(button);

                await channel.send({ embeds: [embed], components: [row] });

                const stmt = db.prepare('INSERT OR REPLACE INTO ticket_system2 (guild_id, support_role_id, ticket_counter, category_id, welcome_message, log_channel_id) VALUES (?, COALESCE((SELECT support_role_id FROM ticket_system2 WHERE guild_id = ?), NULL), COALESCE((SELECT ticket_counter FROM ticket_system2 WHERE guild_id = ?), 0), ?, ?, COALESCE((SELECT log_channel_id FROM ticket_system2 WHERE guild_id = ?), NULL))');
                stmt.run(interaction.guildId, interaction.guildId, interaction.guildId, category.id, welcomeMsg, interaction.guildId);

                await interaction.reply({ content: 'تم إرسال نظام التكتات بنجاح!', ephemeral: true });
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

                await interaction.reply({ content: `تم تحديد <#${channel.id}> كروم حساب الضريبة`, ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'صار خطأ', ephemeral: true });
            }
        }

        if (commandName === 'تقديم') {
            const channel = interaction.options.getChannel('الروم');

            try {
                const embed = new EmbedBuilder()
                    .setTitle('تقديم على الإدارة')
                    .setDescription('هنا يمكنك التقديم للادارة')
                    .setThumbnail(interaction.guild.iconURL())
                    .setColor('#5865F2');

                const button = new ButtonBuilder()
                    .setCustomId('start_application')
                    .setLabel('تقديم ادارة')
                    .setStyle(ButtonStyle.Primary);

                const row = new ActionRowBuilder().addComponents(button);

                await channel.send({ embeds: [embed], components: [row] });
                await interaction.reply({ content: 'تم إرسال نظام التقديم بنجاح!', ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'صار خطأ', ephemeral: true });
            }
        }

        if (commandName === 'ارسال-رسالة') {
            const channel = interaction.options.getChannel('الروم');
            const title = interaction.options.getString('العنوان');
            const description = interaction.options.getString('الوصف');
            const attachment = interaction.options.getAttachment('الصورة');
            const buttonsText = interaction.options.getString('الازرار');
            const messagesText = interaction.options.getString('الرسائل');

            try {
                const buttonNames = buttonsText.split('/').map(b => b.trim()).filter(b => b);
                const buttonMessages = messagesText.split('/').map(m => m.trim()).filter(m => m);

                if (buttonNames.length !== buttonMessages.length) {
                    return interaction.reply({ content: 'عدد الأزرار يجب أن يساوي عدد الرسائل!', ephemeral: true });
                }

                if (buttonNames.length > 5) {
                    return interaction.reply({ content: 'الحد الأقصى 5 أزرار فقط!', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(description)
                    .setColor('#5865F2');

                if (attachment) embed.setImage(attachment.url);

                const buttons = buttonNames.map((name, index) => {
                    return new ButtonBuilder()
                        .setCustomId(`custom_button_${index}`)
                        .setLabel(name)
                        .setStyle(ButtonStyle.Primary);
                });

                const row = new ActionRowBuilder().addComponents(buttons);

                const sentMessage = await channel.send({ embeds: [embed], components: [row] });

                const buttonsData = buttonNames.map((name, index) => ({
                    name: name,
                    message: buttonMessages[index]
                }));

                const stmt = db.prepare('INSERT OR REPLACE INTO button_messages (message_id, guild_id, buttons_data) VALUES (?, ?, ?)');
                stmt.run(sentMessage.id, interaction.guildId, JSON.stringify(buttonsData));

                await interaction.reply({ content: 'تم إرسال الرسالة بنجاح!', ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'صار خطأ', ephemeral: true });
            }
        }

        if (commandName === 'ارسال-خاص') {
            try {
                const messages = [];
                for (let i = 1; i <= 5; i++) {
                    const msg = interaction.options.getString(`رسالة${i}`);
                    if (msg) messages.push(msg);
                }

                if (messages.length === 0) {
                    return interaction.reply({ content: 'يجب كتابة رسالة واحدة على الأقل!', ephemeral: true });
                }

                const memberCount = interaction.options.getInteger('عدد_الاعضاء');
                const membersText = interaction.options.getString('الاعضاء');
                const membersFile = interaction.options.getAttachment('ملف_الاعضاء');
                const withMention = interaction.options.getBoolean('منشن') || false;

                let memberIds = [];

                if (memberCount && memberCount > 0) {
                    await interaction.deferReply({ ephemeral: true });
                    await interaction.guild.members.fetch();
                    const allMembers = interaction.guild.members.cache
                        .filter(member => !member.user.bot)
                        .map(member => member.id);
                    
                    if (allMembers.length < memberCount) {
                        return interaction.editReply({ 
                            content: `السيرفر يحتوي على ${allMembers.length} عضو فقط!`
                        });
                    }

                    const shuffled = [...allMembers].sort(() => 0.5 - Math.random());
                    memberIds = shuffled.slice(0, memberCount);
                    
                } else if (membersFile) {
                    await interaction.deferReply({ ephemeral: true });
                    try {
                        const response = await fetch(membersFile.url);
                        const fileContent = await response.text();
                        memberIds = fileContent
                            .split(/[\n,]/)
                            .map(id => id.trim())
                            .filter(id => id && /^\d+$/.test(id));
                    } catch (error) {
                        return interaction.editReply({ content: 'فشل قراءة الملف!' });
                    }
                } else if (membersText) {
                    await interaction.deferReply({ ephemeral: true });
                    memberIds = membersText
                        .split(/[\n,]/)
                        .map(id => id.trim())
                        .filter(id => id && /^\d+$/.test(id));
                } else {
                    return interaction.reply({ content: 'يجب تحديد عدد الأعضاء أو أيدي أو ملف!', ephemeral: true });
                }

                if (memberIds.length === 0) {
                    return interaction.editReply({ content: 'لم يتم العثور على أعضاء!' });
                }

                await interaction.editReply({ content: `جاري إرسال الرسائل لـ ${memberIds.length} عضو...` });

                let successCount = 0;
                let failCount = 0;

                for (const memberId of memberIds) {
                    try {
                        const member = await interaction.guild.members.fetch(memberId);
                        
                        for (const message of messages) {
                            let finalMessage = message;
                            if (withMention) {
                                finalMessage = `<@${memberId}> ${message}`;
                            }
                            
                            await member.send(finalMessage);
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                        
                        successCount++;
                    } catch (error) {
                        console.error(`فشل إرسال رسالة لـ ${memberId}:`, error);
                        failCount++;
                    }
                }

                await interaction.editReply({ 
                    content: `تم إرسال الرسائل!\n✅ نجح: ${successCount}\n❌ فشل: ${failCount}\nالإجمالي: ${memberIds.length}`
                });

            } catch (error) {
                console.error(error);
                if (interaction.deferred) {
                    await interaction.editReply({ content: 'صار خطأ في إرسال الرسائل' });
                } else {
                    await interaction.reply({ content: 'صار خطأ في إرسال الرسائل', ephemeral: true });
                }
            }
        }
    }

    if (interaction.isButton()) {
        // فتح تكت - نظام 1
        if (interaction.customId === 'open_ticket_system1') {
            const stmt = db.prepare('SELECT * FROM ticket_system1 WHERE guild_id = ?');
            const settings = stmt.get(interaction.guildId);

            if (!settings || !settings.support_role_id) {
                return interaction.reply({ content: 'لم يتم تحديد رتبة الدعم بعد', ephemeral: true });
            }

            // التحقق من وجود تكت مفتوح
            const checkStmt = db.prepare('SELECT channel_id FROM active_tickets WHERE owner_id = ? AND guild_id = ? AND system = ?');
            const existingTicket = checkStmt.get(interaction.user.id, interaction.guildId, 'system1');

            if (existingTicket) {
                return interaction.reply({ content: `لديك تكت مفتوح بالفعل: <#${existingTicket.channel_id}>`, ephemeral: true });
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
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles]
                        },
                        {
                            id: settings.support_role_id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                        }
                    ]
                });

                // حفظ التكت في قاعدة البيانات
                const saveStmt = db.prepare('INSERT INTO active_tickets (channel_id, guild_id, owner_id, claimer_id, system) VALUES (?, ?, ?, NULL, ?)');
                saveStmt.run(ticketChannel.id, interaction.guildId, interaction.user.id, 'system1');

                const welcomeEmbed = new EmbedBuilder()
                    .setDescription(`**الشخص:** <@${interaction.user.id}>\n\n${settings.welcome_message || 'مرحباً! فريق الدعم سيرد عليك قريباً'}`)
                    .setThumbnail(interaction.guild.iconURL())
                    .setColor('#5865F2');

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`ticket_menu_system1_${ticketChannel.id}`)
                    .setPlaceholder('اختر خيار')
                    .addOptions([
                        {
                            label: 'قفل',
                            value: 'close',
                            emoji: '🔒'
                        },
                        {
                            label: 'استلام',
                            value: 'claim',
                            emoji: '✋'
                        },
                        {
                            label: 'طلب استلام',
                            value: 'request_claim',
                            emoji: '📢'
                        }
                    ]);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                await ticketChannel.send({ embeds: [welcomeEmbed], components: [row] });
                await interaction.reply({ content: `تم فتح تكت: <#${ticketChannel.id}>`, ephemeral: true });

                await sendLog(interaction.guildId, 'ticket_system1', `تم فتح التكت #ticket-${counter}`, `<@${interaction.user.id}>`);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'صار خطأ', ephemeral: true });
            }
        }

        // فتح تكت - نظام 2
        if (interaction.customId === 'open_ticket_system2') {
            const stmt = db.prepare('SELECT * FROM ticket_system2 WHERE guild_id = ?');
            const settings = stmt.get(interaction.guildId);

            if (!settings || !settings.support_role_id) {
                return interaction.reply({ content: 'لم يتم تحديد رتبة الدعم بعد', ephemeral: true });
            }

            const checkStmt = db.prepare('SELECT channel_id FROM active_tickets WHERE owner_id = ? AND guild_id = ? AND system = ?');
            const existingTicket = checkStmt.get(interaction.user.id, interaction.guildId, 'system2');

            if (existingTicket) {
                return interaction.reply({ content: `لديك تكت مفتوح بالفعل: <#${existingTicket.channel_id}>`, ephemeral: true });
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
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles]
                        },
                        {
                            id: settings.support_role_id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                        }
                    ]
                });

                const saveStmt = db.prepare('INSERT INTO active_tickets (channel_id, guild_id, owner_id, claimer_id, system) VALUES (?, ?, ?, NULL, ?)');
                saveStmt.run(ticketChannel.id, interaction.guildId, interaction.user.id, 'system2');

                const welcomeEmbed = new EmbedBuilder()
                    .setDescription(`**الشخص:** <@${interaction.user.id}>\n\n${settings.welcome_message || 'مرحباً! فريق الدعم سيرد عليك قريباً'}`)
                    .setThumbnail(interaction.guild.iconURL())
                    .setColor('#5865F2');

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`ticket_menu_system2_${ticketChannel.id}`)
                    .setPlaceholder('اختر خيار')
                    .addOptions([
                        {
                            label: 'قفل',
                            value: 'close',
                            emoji: '🔒'
                        },
                        {
                            label: 'استلام',
                            value: 'claim',
                            emoji: '✋'
                        },
                        {
                            label: 'طلب استلام',
                            value: 'request_claim',
                            emoji: '📢'
                        }
                    ]);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                await ticketChannel.send({ embeds: [welcomeEmbed], components: [row] });
                await interaction.reply({ content: `تم فتح تكت: <#${ticketChannel.id}>`, ephemeral: true });

                await sendLog(interaction.guildId, 'ticket_system2', `تم فتح التكت #ticket-${counter}`, `<@${interaction.user.id}>`);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'صار خطأ', ephemeral: true });
            }
        }

        // أزرار مخصصة
        if (interaction.customId.startsWith('custom_button_')) {
            const stmt = db.prepare('SELECT buttons_data FROM button_messages WHERE message_id = ?');
            const data = stmt.get(interaction.message.id);

            if (data) {
                const buttonsData = JSON.parse(data.buttons_data);
                const index = parseInt(interaction.customId.split('_')[2]);
                const buttonData = buttonsData[index];

                if (buttonData) {
                    await interaction.reply({ content: buttonData.message, ephemeral: true });
                }
            }
        }

        // تقديم إدارة
        if (interaction.customId === 'start_application') {
            const hasLevel10 = await checkLevel10(interaction.guild, interaction.user.id);

            if (!hasLevel10) {
                return interaction.reply({ content: 'ما تستحي ماعندك لفل 10 وجاي تقدم', ephemeral: true });
            }

            const dmButton = new ButtonBuilder()
                .setLabel('افتح الخاص')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://discord.com/channels/@me/${client.user.id}`);

            const row = new ActionRowBuilder().addComponents(dmButton);

            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('تقديم على الإدارة')
                    .setDescription('هل تريد التقديم إلى الإدارة فعلاً ؟')
                    .setColor('#5865F2');

                const yesButton = new ButtonBuilder()
                    .setCustomId(`confirm_application_${interaction.guildId}`)
                    .setLabel('نعم')
                    .setStyle(ButtonStyle.Success);

                const noButton = new ButtonBuilder()
                    .setCustomId('cancel_application')
                    .setLabel('لا')
                    .setStyle(ButtonStyle.Danger);

                const dmRow = new ActionRowBuilder().addComponents(yesButton, noButton);

                await interaction.user.send({ embeds: [dmEmbed], components: [dmRow] });
                await interaction.reply({ content: 'تم إرسال رسالة في الخاص!', components: [row], ephemeral: true });
            } catch (error) {
                await interaction.reply({ content: 'لا يمكنني إرسال رسالة لك! تأكد من فتح الخاص', ephemeral: true });
            }
        }

        if (interaction.customId.startsWith('confirm_application_')) {
            const guildId = interaction.customId.split('_')[2];
            
            applicationStates.set(interaction.user.id, {
                guildId: guildId,
                step: 0,
                answers: []
            });

            const embed = new EmbedBuilder()
                .setTitle('السؤال الأول')
                .setDescription('اسمك :')
                .setColor('#5865F2');

            await interaction.update({ embeds: [embed], components: [] });
        }

        if (interaction.customId === 'cancel_application') {
            await interaction.update({ content: 'تم إلغاء التقديم', embeds: [], components: [] });
        }
    }

    if (interaction.isStringSelectMenu()) {
        if (interaction.customId.startsWith('ticket_menu_system1_')) {
            const channelId = interaction.customId.split('_')[3];
            const value = interaction.values[0];

            const ticketStmt = db.prepare('SELECT * FROM active_tickets WHERE channel_id = ?');
            const ticket = ticketStmt.get(channelId);

            if (!ticket) {
                return interaction.reply({ content: 'حدث خطأ في العثور على التكت', ephemeral: true });
            }

            const systemStmt = db.prepare('SELECT support_role_id FROM ticket_system1 WHERE guild_id = ?');
            const settings = systemStmt.get(interaction.guildId);

            if (value === 'claim') {
                if (ticket.claimer_id) {
                    return interaction.reply({ content: 'تم استلام التكت بالفعل!', ephemeral: true });
                }

                if (interaction.user.id === ticket.owner_id) {
                    return interaction.reply({ content: 'لا يمكنك استلام تكتك الخاص!', ephemeral: true });
                }

                if (!interaction.member.roles.cache.has(settings.support_role_id)) {
                    return interaction.reply({ content: 'ليس لديك صلاحية استلام التكتات!', ephemeral: true });
                }

                // تحديث المستلم
                const updateStmt = db.prepare('UPDATE active_tickets SET claimer_id = ? WHERE channel_id = ?');
                updateStmt.run(interaction.user.id, channelId);

                // منع باقي الدعم من الكتابة
                const channel = interaction.guild.channels.cache.get(channelId);
                await channel.permissionOverwrites.edit(settings.support_role_id, {
                    SendMessages: false,
                    CreatePublicThreads: true
                });

                await channel.permissionOverwrites.edit(interaction.user.id, {
                    SendMessages: true,
                    ViewChannel: true
                });

                const embed = new EmbedBuilder()
                    .setDescription(`تم استلام التكت بواسطة <@${interaction.user.id}>`)
                    .setColor('#00FF00');

                await interaction.reply({ embeds: [embed] });
                await sendLog(interaction.guildId, 'ticket_system1', `تم استلام التكت`, `<@${interaction.user.id}>`);
            }

            if (value === 'request_claim') {
                if (!ticket.claimer_id) {
                    return interaction.reply({ content: 'لا يمكن طلب الاستلام! التكت غير مستلم بعد', ephemeral: true });
                }

                if (interaction.user.id === ticket.owner_id) {
                    return interaction.reply({ content: 'لا يمكنك طلب استلام تكتك الخاص!', ephemeral: true });
                }

                if (interaction.user.id === ticket.claimer_id) {
                    return interaction.reply({ content: 'أنت مستلم التكت بالفعل!', ephemeral: true });
                }

                if (!interaction.member.roles.cache.has(settings.support_role_id)) {
                    return interaction.reply({ content: 'ليس لديك صلاحية طلب الاستلام!', ephemeral: true });
                }

                const requestEmbed = new EmbedBuilder()
                    .setDescription(`طلب استلام من <@${interaction.user.id}>`)
                    .setColor('#FFA500');

                const acceptButton = new ButtonBuilder()
                    .setCustomId(`accept_claim_${interaction.user.id}_${channelId}`)
                    .setLabel('قبول')
                    .setStyle(ButtonStyle.Success);

                const rejectButton = new ButtonBuilder()
                    .setCustomId(`reject_claim_${interaction.user.id}_${channelId}`)
                    .setLabel('رفض')
                    .setStyle(ButtonStyle.Danger);

                const row = new ActionRowBuilder().addComponents(acceptButton, rejectButton);

                await interaction.reply({ embeds: [requestEmbed], components: [row] });
            }

            if (value === 'close') {
                if (ticket.claimer_id && ticket.claimer_id !== interaction.user.id) {
                    return interaction.reply({ content: 'فقط المستلم يمكنه قفل التكت!', ephemeral: true });
                }

                const closeEmbed = new EmbedBuilder()
                    .setDescription(`هل أنت متأكد من قفل التكت؟`)
                    .setColor('#FF0000');

                const confirmButton = new ButtonBuilder()
                    .setCustomId(`confirm_close_${channelId}`)
                    .setLabel('تأكيد القفل')
                    .setStyle(ButtonStyle.Danger);

                const cancelButton = new ButtonBuilder()
                    .setCustomId(`cancel_close`)
                    .setLabel('إلغاء')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

                await interaction.reply({ embeds: [closeEmbed], components: [row], ephemeral: true });
            }
        }

        if (interaction.customId.startsWith('ticket_menu_system2_')) {
            const channelId = interaction.customId.split('_')[3];
            const value = interaction.values[0];

            const ticketStmt = db.prepare('SELECT * FROM active_tickets WHERE channel_id = ?');
            const ticket = ticketStmt.get(channelId);

            if (!ticket) {
                return interaction.reply({ content: 'حدث خطأ في العثور على التكت', ephemeral: true });
            }

            const systemStmt = db.prepare('SELECT support_role_id FROM ticket_system2 WHERE guild_id = ?');
            const settings = systemStmt.get(interaction.guildId);

            if (value === 'claim') {
                if (ticket.claimer_id) {
                    return interaction.reply({ content: 'تم استلام التكت بالفعل!', ephemeral: true });
                }

                if (interaction.user.id === ticket.owner_id) {
                    return interaction.reply({ content: 'لا يمكنك استلام تكتك الخاص!', ephemeral: true });
                }

                if (!interaction.member.roles.cache.has(settings.support_role_id)) {
                    return interaction.reply({ content: 'ليس لديك صلاحية استلام التكتات!', ephemeral: true });
                }

                const updateStmt = db.prepare('UPDATE active_tickets SET claimer_id = ? WHERE channel_id = ?');
                updateStmt.run(interaction.user.id, channelId);

                const channel = interaction.guild.channels.cache.get(channelId);
                await channel.permissionOverwrites.edit(settings.support_role_id, {
                    SendMessages: false,
                    CreatePublicThreads: true
                });

                await channel.permissionOverwrites.edit(interaction.user.id, {
                    SendMessages: true,
                    ViewChannel: true
                });

                const embed = new EmbedBuilder()
                    .setDescription(`تم استلام التكت بواسطة <@${interaction.user.id}>`)
                    .setColor('#00FF00');

                await interaction.reply({ embeds: [embed] });
                await sendLog(interaction.guildId, 'ticket_system2', `تم استلام التكت`, `<@${interaction.user.id}>`);
            }

            if (value === 'request_claim') {
                if (!ticket.claimer_id) {
                    return interaction.reply({ content: 'لا يمكن طلب الاستلام! التكت غير مستلم بعد', ephemeral: true });
                }

                if (interaction.user.id === ticket.owner_id) {
                    return interaction.reply({ content: 'لا يمكنك طلب استلام تكتك الخاص!', ephemeral: true });
                }

                if (interaction.user.id === ticket.claimer_id) {
                    return interaction.reply({ content: 'أنت مستلم التكت بالفعل!', ephemeral: true });
                }

                if (!interaction.member.roles.cache.has(settings.support_role_id)) {
                    return interaction.reply({ content: 'ليس لديك صلاحية طلب الاستلام!', ephemeral: true });
                }

                const requestEmbed = new EmbedBuilder()
                    .setDescription(`طلب استلام من <@${interaction.user.id}>`)
                    .setColor('#FFA500');

                const acceptButton = new ButtonBuilder()
                    .setCustomId(`accept_claim_${interaction.user.id}_${channelId}`)
                    .setLabel('قبول')
                    .setStyle(ButtonStyle.Success);

                const rejectButton = new ButtonBuilder()
                    .setCustomId(`reject_claim_${interaction.user.id}_${channelId}`)
                    .setLabel('رفض')
                    .setStyle(ButtonStyle.Danger);

                const row = new ActionRowBuilder().addComponents(acceptButton, rejectButton);

                await interaction.reply({ embeds: [requestEmbed], components: [row] });
            }

            if (value === 'close') {
                if (ticket.claimer_id && ticket.claimer_id !== interaction.user.id) {
                    return interaction.reply({ content: 'فقط المستلم يمكنه قفل التكت!', ephemeral: true });
                }

                const closeEmbed = new EmbedBuilder()
                    .setDescription(`هل أنت متأكد من قفل التكت؟`)
                    .setColor('#FF0000');

                const confirmButton = new ButtonBuilder()
                    .setCustomId(`confirm_close_${channelId}`)
                    .setLabel('تأكيد القفل')
                    .setStyle(ButtonStyle.Danger);

                const cancelButton = new ButtonBuilder()
                    .setCustomId(`cancel_close`)
                    .setLabel('إلغاء')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

                await interaction.reply({ embeds: [closeEmbed], components: [row], ephemeral: true });
            }
        }
    }

    // أزرار قبول/رفض طلب الاستلام
    if (interaction.isButton()) {
        if (interaction.customId.startsWith('accept_claim_')) {
            const parts = interaction.customId.split('_');
            const requesterId = parts[2];
            const channelId = parts[3];

            const ticketStmt = db.prepare('SELECT * FROM active_tickets WHERE channel_id = ?');
            const ticket = ticketStmt.get(channelId);

            if (interaction.user.id !== ticket.claimer_id) {
                return interaction.reply({ content: 'فقط المستلم يمكنه قبول الطلب!', ephemeral: true });
            }

            const channel = interaction.guild.channels.cache.get(channelId);
            const systemStmt = db.prepare(`SELECT support_role_id FROM ${ticket.system === 'system1' ? 'ticket_system1' : 'ticket_system2'} WHERE guild_id = ?`);
            const settings = systemStmt.get(interaction.guildId);

            // إزالة صلاحيات المستلم القديم
            await channel.permissionOverwrites.edit(ticket.claimer_id, {
                SendMessages: false
            });

            // إضافة صلاحيات للمستلم الجديد
            await channel.permissionOverwrites.edit(requesterId, {
                SendMessages: true,
                ViewChannel: true
            });

            // تحديث المستلم
            const updateStmt = db.prepare('UPDATE active_tickets SET claimer_id = ? WHERE channel_id = ?');
            updateStmt.run(requesterId, channelId);

            const embed = new EmbedBuilder()
                .setDescription(`تم قبول الطلب! <@${requesterId}> هو المستلم الجديد`)
                .setColor('#00FF00');

            await interaction.update({ embeds: [embed], components: [] });
        }

        if (interaction.customId.startsWith('reject_claim_')) {
            const parts = interaction.customId.split('_');
            const channelId = parts[3];

            const ticketStmt = db.prepare('SELECT * FROM active_tickets WHERE channel_id = ?');
            const ticket = ticketStmt.get(channelId);

            if (interaction.user.id !== ticket.claimer_id) {
                return interaction.reply({ content: 'فقط المستلم يمكنه رفض الطلب!', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setDescription('تم رفض طلب الاستلام')
                .setColor('#FF0000');

            await interaction.update({ embeds: [embed], components: [] });
        }

        if (interaction.customId.startsWith('confirm_close_')) {
            const channelId = interaction.customId.split('_')[2];
            const channel = interaction.guild.channels.cache.get(channelId);

            await interaction.update({ content: 'سيتم حذف التكت بعد 5 ثواني...', embeds: [], components: [] });

            setTimeout(async () => {
                const ticketStmt = db.prepare('SELECT system FROM active_tickets WHERE channel_id = ?');
                const ticket = ticketStmt.get(channelId);

                const deleteStmt = db.prepare('DELETE FROM active_tickets WHERE channel_id = ?');
                deleteStmt.run(channelId);

                await sendLog(interaction.guildId, ticket.system === 'system1' ? 'ticket_system1' : 'ticket_system2', `تم حذف التكت`, `<@${interaction.user.id}>`);
                await channel.delete();
            }, 5000);
        }

        if (interaction.customId === 'cancel_close') {
            await interaction.update({ content: 'تم إلغاء القفل', embeds: [], components: [] });
        }
    }
});

client.login(process.env.TOKEN);
