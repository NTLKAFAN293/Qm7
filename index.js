require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder } = require('discord.js');
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
        .setDescription('إرسال رسالة بإيمبد مع أزرار تفاعلية')
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
                .setDescription('أسماء الأزرار مفصولة بـ / (مثال: تقديم/تكت/مساعدة)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('الرسائل')
                .setDescription('رسائل الأزرار بنفس الترتيب مفصولة بـ / (مثال: رسالة1/رسالة2/رسالة3)')
                .setRequired(true))
        .addAttachmentOption(option =>
            option.setName('الصورة')
                .setDescription('صورة الإيمبد (اختياري)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('ارسال-خاص')
        .setDescription('إرسال رسائل خاصة متعددة')
        .addIntegerOption(option =>
            option.setName('عدد_الاعضاء')
                .setDescription('عدد الأعضاء العشوائيين (مثال: 60)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('الاعضاء')
                .setDescription('أيدي الأعضاء مفصولة بـ , (مثال: 123,456,789)')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('ملف_الاعضاء')
                .setDescription('ملف نصي يحتوي على أيدي الأعضاء (كل أيدي في سطر)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('رسالة1')
                .setDescription('الرسالة الأولى (اختياري)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('رسالة2')
                .setDescription('الرسالة الثانية (اختياري)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('رسالة3')
                .setDescription('الرسالة الثالثة (اختياري)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('رسالة4')
                .setDescription('الرسالة الرابعة (اختياري)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('رسالة5')
                .setDescription('الرسالة الخامسة (اختياري)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('رسالة6')
                .setDescription('الرسالة السادسة (اختياري)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('رسالة7')
                .setDescription('الرسالة السابعة (اختياري)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('رسالة8')
                .setDescription('الرسالة الثامنة (اختياري)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('رسالة9')
                .setDescription('الرسالة التاسعة (اختياري)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('رسالة10')
                .setDescription('الرسالة العاشرة (اختياري)')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('منشن')
                .setDescription('هل تريد منشن الأعضاء؟')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

const PORT = process.env.PORT || 3030;
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

                if (attachment) {
                    embed.setImage(attachment.url);
                }

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
                await interaction.reply({ content: 'صار خطأ في إرسال الرسالة', ephemeral: true });
            }
        }

        if (commandName === 'ارسال-خاص') {
            try {
                const messages = [];
                for (let i = 1; i <= 10; i++) {
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

        if (interaction.customId.startsWith('custom_button_')) {
            const buttonIndex = parseInt(interaction.customId.split('_')[2]);
            const messageId = interaction.message.id;

            try {
                const stmt = db.prepare('SELECT buttons_data FROM button_messages WHERE message_id = ?');
                const result = stmt.get(messageId);

                if (result) {
                    const buttonsData = JSON.parse(result.buttons_data);
                    const buttonData = buttonsData[buttonIndex];

                    if (buttonData) {
                        await interaction.reply({ 
                            content: `**${buttonData.name}:** ${buttonData.message}`, 
                            ephemeral: true 
                        });
                    }
                }
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'حدث خطأ', ephemeral: true });
            }
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

                await ticketChannel.send({ content: `<@&1423814509776212069> <@&1423813680885137549> <@&1423815048836550836>` });
                await ticketChannel.send({ embeds: [welcomeEmbed], components: [row] });
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

                await ticketChannel.send({ content: `<@&1424745273023795400> <@&1424745440569593896> <@&1423700486368006155> <@&1423815048836550836>` });
                await ticketChannel.send({ embeds: [welcomeEmbed], components: [row] });
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

            await sendLog(interaction.guildId, 'ticket_system1', `تم إعادة فتح التكت`, `<@${interaction.user.id}>`);
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

            await sendLog(interaction.guildId, 'ticket_system2', `تم إعادة فتح التكت`, `<@${interaction.user.id}>`);
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
                    .setDescription(`بواسطة: <@${interaction.user.id}>`)
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
                    .setDescription(`بواسطة: <@${interaction.user.id}>`)
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

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

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

    if (message.channel.type === 1) {
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
            const guild = client.guilds.cache.get(state.guildId);
            
            if (guild) {
                const applicationEmbed = new EmbedBuilder()
                    .setTitle('تقديم جديد على الإدارة')
                    .setColor('#5865F2')
                    .addFields(
                        questions.map((q, i) => ({
                            name: q,
                            value: state.answers[i] || 'لا إجابة',
                            inline: false
                        }))
                    )
                    .setFooter({ text: `بواسطة: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

                const acceptButton = new ButtonBuilder()
                    .setCustomId(`accept_application_${message.author.id}`)
                    .setLabel('قبول')
                    .setStyle(ButtonStyle.Success);

                const rejectButton = new ButtonBuilder()
                    .setCustomId(`reject_application_${message.author.id}`)
                    .setLabel('رفض')
                    .setStyle(ButtonStyle.Danger);

                const row = new ActionRowBuilder().addComponents(acceptButton, rejectButton);

                const adminChannel = guild.channels.cache.get('1424502897638506676');
                if (adminChannel) {
                    await adminChannel.send({ content: `<@&1423720110119715010>`, embeds: [applicationEmbed], components: [row] });
                }
            }

            await message.channel.send('تم إرسال تقديمك! سيتم الرد عليك قريباً');
            applicationStates.delete(message.author.id);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
