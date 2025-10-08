
```javascript
require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, StringSelectMenuBuilder } = require('discord.js');
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

    CREATE TABLE IF NOT EXISTS applications (
        user_id TEXT PRIMARY KEY,
        guild_id TEXT,
        answers TEXT,
        status TEXT DEFAULT 'pending'
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
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

// إنشاء خادم HTTP بسيط
const PORT = 3000;
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

// دالة للتحقق من لفل 10
async function checkLevel10(guild, userId) {
    const levelChannel = await guild.channels.fetch('1423420809203941568');
    if (!levelChannel) return false;

    const messages = await levelChannel.messages.fetch({ limit: 100 });
    const userLevelMessage = messages.find(msg => 
        msg.content.includes(`<@${userId}>`) && 
        msg.content.includes('10')
    );

    return !!userLevelMessage;
}

// متغير لتخزين حالة التقديمات
const applicationStates = new Map();

client.once('ready', async () => {
    console.log(`بوت التكتات جاهز: ${client.user.tag}`);

    try {
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
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'start_application') {
            const hasLevel10 = await checkLevel10(interaction.guild, interaction.user.id);

            if (!hasLevel10) {
                return interaction.reply({ content: 'مــا تـــســتـــحــي مـــاعــنـــدك لــفـــل 10 وجــاي تـــقـــدم  <:1000060811:1424502319222886460>', ephemeral: true });
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
                    .setDescription(`**الشخص:** <@${interaction.user.id}>\n\n${settings.welcome_message || 'مرحباً! فريق الدعم سيرد عليك قريباً'}`)
                    .setThumbnail(interaction.guild.iconURL())
                    .setColor('#5865F2');

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`ticket_menu_system1_${ticketChannel.id}_${interaction.user.id}`)
                    .setPlaceholder('اختر خيار')
                    .addOptions([
                        {
                            label: 'قفل',
                            value: 'close',
                            emoji: '<:1000060786:1424455322948468808>'
                        },
                        {
                            label: 'استلام',
                            value: 'claim',
                            emoji: '<a:1000060787:1424455315444990033>'
                        },
                        {
                            label: 'طلب استلام',
                            value: 'request_claim',
                            emoji: '<:1000060789:1424455330523381971>'
                        }
                    ]);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                await ticketChannel.send({ content: `<@&1423813680885137549> <@&1423814509776212069> <@&1423815048836550836>`, embeds: [welcomeEmbed], components: [row] });
                await interaction.reply({ content: `تم فتح تكت: <#${ticketChannel.id}>`, ephemeral: true });

                await sendLog(interaction.guildId, 'ticket_system1', `تم فتح التكت #ticket-${counter}`, `<@${interaction.user.id}>`);
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
                    .setDescription(`**الشخص:** <@${interaction.user.id}>\n\n${settings.welcome_message || 'مرحباً! فريق الدعم سيرد عليك قريباً'}`)
                    .setThumbnail(interaction.guild.iconURL())
                    .setColor('#5865F2');

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`ticket_menu_system2_${ticketChannel.id}_${interaction.user.id}`)
                    .setPlaceholder('اختر خيار')
                    .addOptions([
                        {
                            label: 'قفل',
                            value: 'close',
                            emoji: '<:1000060786:1424455322948468808>'
                        },
                        {
                            label: 'استلام',
                            value: 'claim',
                            emoji: '<a:1000060787:1424455315444990033>'
                        },
                        {
                            label: 'طلب استلام',
                            value: 'request_claim',
                            emoji: '<:1000060789:1424455330523381971>'
                        }
                    ]);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                await ticketChannel.send({ content: `<@&1423700486368006155>`, embeds: [welcomeEmbed], components: [row] });
                await interaction.reply({ content: `تم فتح تكت: <#${ticketChannel.id}>`, ephemeral: true });

                await sendLog(interaction.guildId, 'ticket_system2', `تم فتح التكت #ticket-${counter}`, `<@${interaction.user.id}>`);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'صار خطأ', ephemeral: true });
            }
        }

        if (interaction.customId.startsWith('delete_ticket_system1_')) {
            const ticketId = interaction.customId.split('_')[3];
            const channel = interaction.guild.channels.cache.get(ticketId);

            try {
                await interaction.update({ content: 'سيتم حذف التكت بعد 5 ثواني....', embeds: [], components: [] });
                
                setTimeout(async () => {
                    await sendLog(interaction.guildId, 'ticket_system1', `تم حذف التكت #${channel.name}`, `<@${interaction.user.id}>`);
                    await channel.delete();
                }, 5000);
            } catch (error) {
                console.error(error);
            }
        }

        if (interaction.customId.startsWith('delete_ticket_system2_')) {
            const ticketId = interaction.customId.split('_')[3];
            const channel = interaction.guild.channels.cache.get(ticketId);

            try {
                await interaction.update({ content: 'سيتم حذف التكت بعد 5 ثواني....', embeds: [], components: [] });
                
                setTimeout(async () => {
                    await sendLog(interaction.guildId, 'ticket_system2', `تم حذف التكت #${channel.name}`, `<@${interaction.user.id}>`);
                    await channel.delete();
                }, 5000);
            } catch (error) {
                console.error(error);
            }
        }

        if (interaction.customId.startsWith('reopen_ticket_system1_')) {
            const parts = interaction.customId.split('_');
            const ticketId = parts[3];
            const ownerId = parts[4];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`ticket_menu_system1_${ticketId}_${ownerId}`)
                .setPlaceholder('اختر خيار')
                .addOptions([
                    {
                        label: 'قفل',
                        value: 'close',
                        emoji: '<:1000060786:1424455322948468808>'
                    },
                    {
                        label: 'استلام',
                        value: 'claim',
                        emoji: '<a:1000060787:1424455315444990033>'
                    },
                    {
                        label: 'طلب استلام',
                        value: 'request_claim',
                        emoji: '<:1000060789:1424455330523381971>'
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setDescription(`تم إعادة فتح التكت بواسطة <@${interaction.user.id}>`)
                .setColor('#00FF00');

            await interaction.update({ embeds: [embed], components: [row] });

            await sendLog(interaction.guildId, 'ticket_system1', `تم إعادة فتح التكت #ticket-`, `<@${interaction.user.id}>`);
        }

        if (interaction.customId.startsWith('reopen_ticket_system2_')) {
            const parts = interaction.customId.split('_');
            const ticketId = parts[3];
            const ownerId = parts[4];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`ticket_menu_system2_${ticketId}_${ownerId}`)
                .setPlaceholder('اختر خيار')
                .addOptions([
                    {
                        label: 'قفل',
                        value: 'close',
                        emoji: '<:1000060786:1424455322948468808>'
                    },
                    {
                        label: 'استلام',
                        value: 'claim',
                        emoji: '<a:1000060787:1424455315444990033>'
                    },
                    {
                        label: 'طلب استلام',
                        value: 'request_claim',
                        emoji: '<:1000060789:1424455330523381971>'
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setDescription(`تم إعادة فتح التكت بواسطة <@${interaction.user.id}>`)
                .setColor('#00FF00');

            await interaction.update({ embeds: [embed], components: [row] });

            await sendLog(interaction.guildId, 'ticket_system2', `تم إعادة فتح التكت #ticket-`, `<@${interaction.user.id}>`);
        }

        if (interaction.customId.startsWith('accept_application_')) {
            const userId = interaction.customId.split('_')[2];
            
            try {
                const guild = interaction.guild;
                const member = await guild.members.fetch(userId);
                const role = guild.roles.cache.get('1423720110119715010');
                
                if (role) {
                    await member.roles.add(role);
                }

                const user = await client.users.fetch(userId);
                const acceptEmbed = new EmbedBuilder()
                    .setTitle('تهانينا! 🎉')
                    .setDescription('تم قبولك في الإدارة! مبروك 🎊')
                    .setColor('#00FF00');

                await user.send({ embeds: [acceptEmbed] });
                await interaction.update({ content: `تم قبول <@${userId}>`, components: [] });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'حدث خطأ', ephemeral: true });
            }
        }

        if (interaction.customId.startsWith('reject_application_')) {
            const userId = interaction.customId.split('_')[2];
            
            try {
                const user = await client.users.fetch(userId);
                const rejectEmbed = new EmbedBuilder()
                    .setTitle('نأسف 😔')
                    .setDescription('تم رفض تقديمك على الإدارة. حظ أوفر في المرة القادمة!')
                    .setColor('#FF0000');

                await user.send({ embeds: [rejectEmbed] });
                await interaction.update({ content: `تم رفض <@${userId}>`, components: [] });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'حدث خطأ', ephemeral: true });
            }
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

    if (interaction.isStringSelectMenu()) {
        if (interaction.customId.startsWith('ticket_menu_system1_')) {
            const parts = interaction.customId.split('_');
            const ticketId = parts[3];
            const ownerId = parts[4];
            const selectedValue = interaction.values[0];

            if (selectedValue === 'close') {
                if (interaction.user.id === ownerId) {
                    return interaction.reply({ content: 'لا يمكنك قفل التكت الخاص بك', ephemeral: true });
                }

                const stmt = db.prepare('SELECT support_role_id FROM ticket_system1 WHERE guild_id = ?');
                const settings = stmt.get(interaction.guildId);

                if (!interaction.member.roles.cache.has(settings.support_role_id)) {
                    return interaction.reply({ content: 'لا تملك صلاحية قفل التكت', ephemeral: true });
                }

                await interaction.deferUpdate();

                const embed = new EmbedBuilder()
                    .setTitle('تم قفل التكت')
                    .setDescription(`بواسطة: <@${interaction.user.id}>\n\nBot is thinking...`)
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

                await interaction.editReply({ embeds: [embed], components: [row] });

                await sendLog(interaction.guildId, 'ticket_system1', `تم قفل التكت #${interaction.channel.name}`, `<@${interaction.user.id}>`);
            } else if (selectedValue === 'claim') {
                await interaction.reply({ content: `تم استلام التكت بواسطة <@${interaction.user.id}>`, ephemeral: false });
            } else if (selectedValue === 'request_claim') {
                await interaction.reply({ content: `<@${interaction.user.id}> يطلب استلام التكت`, ephemeral: false });
            }
        }

        if (interaction.customId.startsWith('ticket_menu_system2_')) {
            const parts = interaction.customId.split('_');
            const ticketId = parts[3];
            const ownerId = parts[4];
            const selectedValue = interaction.values[0];

            if (selectedValue === 'close') {
                if (interaction.user.id === ownerId) {
                    return interaction.reply({ content: 'لا يمكنك قفل التكت الخاص بك', ephemeral: true });
                }

                const stmt = db.prepare('SELECT support_role_id FROM ticket_system2 WHERE guild_id = ?');
                const settings = stmt.get(interaction.guildId);

                if (!interaction.member.roles.cache.has(settings.support_role_id)) {
                    return interaction.reply({ content: 'لا تملك صلاحية قفل التكت', ephemeral: true });
                }

                await interaction.deferUpdate();

                const embed = new EmbedBuilder()
                    .setTitle('تم قفل التكت')
                    .setDescription(`بواسطة: <@${interaction.user.id}>\n\nBot is thinking...`)
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

                await interaction.editReply({ embeds: [embed], components: [row] });

                await sendLog(interaction.guildId, 'ticket_system2', `تم قفل التكت #${interaction.channel.name}`, `<@${interaction.user.id}>`);
            } else if (selectedValue === 'claim') {
                await interaction.reply({ content: `تم استلام التكت بواسطة <@${interaction.user.id}>`, ephemeral: false });
            } else if (selectedValue === 'request_claim') {
                await interaction.reply({ content: `<@${interaction.user.id}> يطلب استلام التكت`, ephemeral: false });
            }
        }
    }
});

// التعامل مع الرسائل
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // نظام الضريبة
    const stmt = db.prepare('SELECT channel_id FROM tax_channels WHERE guild_id = ?');
    const taxChannel = stmt.get(message.guildId);

    if (taxChannel && message.channelId === taxChannel.channel_id) {
        let amountStr = message.content.trim().toLowerCase();
        let amount = 0;

        if (amountStr.includes('b')) {
            const num = parseFloat(amountStr.replace('b', ''));
            amount = Math.floor(num * 1000000000);
        } else if (amountStr.includes('m')) {
            const num = parseFloat(amountStr.replace('m', ''));
            amount = Math.floor(num * 1000000);
        } else if (amountStr.includes('k')) {
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
        return;
    }

    // نظام التقديم - الإجابة على الأسئلة
    if (message.channel.type === 1) { // DM
        const state = applicationStates.get(message.author.id);
        
        if (!state) return;

        const questions = [
            'اسمك :',
            'عمرك :',
            'من وين ؟ :',
            'خبراتك :',
            '👇🏼\nاذا اداري اشتكى على اداري ماذا تفعل مع ذكر التفاصيل ؟ :',
            'اذا اداري يستعمل رتبته بشكل خاطئ ماذا تفعل ؟ مع ذكر التفاصيل :',
            'اذا لقيت شخص اعلى منك رتبه يسب وا يسوي المشاكل ماذا تفعل :',
            'اتعهد انك متخرب السيرفر :'
        ];

        state.answers.push(message.content);

        if (state.step < questions.length - 1) {
            state.step++;
            
            const embed = new EmbedBuilder()
                .setTitle(`السؤال ${state.step + 1}`)
                .setDescription(questions[state.step])
                .setColor('#5865F2');

            await message.channel.send({ embeds: [embed] });
        } else {
            // انتهى التقديم
            const finalEmbed = new EmbedBuilder()
                .setTitle('تم إرسال تقديمك')
                .setDescription('يرجى انتظار قبولك او رفضك\n-# ان شاء لله تنرفض')
                .setColor('#00FF00');

            await message.channel.send({ embeds: [finalEmbed] });

            // إرسال التقديم للروم
            try {
                const guild = await client.guilds.fetch(state.guildId);
                const reviewChannel = await guild.channels.fetch('1424502897638506676');

                let description = '';
                for (let i = 0; i < questions.length; i++) {
                    description += `**${questions[i]}**\n${state.answers[i]}\n\n`;
                }
                description += `**الشخص:** <@${message.author.id}>`;

                const reviewEmbed = new EmbedBuilder()
                    .setTitle('تقديم جديد على الإدارة')
                    .setDescription(description)
                    .setColor('#5865F2');

                const acceptButton = new ButtonBuilder()
                    .setCustomId(`accept_application_${message.author.id}`)
                    .setLabel('قبول')
                    .setStyle(ButtonStyle.Success);

                const rejectButton = new ButtonBuilder()
                    .setCustomId(`reject_application_${message.author.id}`)
                    .setLabel('رفض')
                    .setStyle(ButtonStyle.Danger);

                const row = new ActionRowBuilder().addComponents(acceptButton, rejectButton);

                await reviewChannel.send({ embeds: [reviewEmbed], components: [row] });
            } catch (error) {
                console.error(error);
            }

            applicationStates.delete(message.author.id);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
```
