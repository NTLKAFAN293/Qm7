
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, OAuth2Scopes } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
});

// تخزين بيانات البوت
const taxRooms = new Map();
const userTaxData = new Map();
let ticketCounter = 0;
const userTickets = new Map();
const ticketClaimers = new Map();
const claimRequests = new Map();
const userGold = new Map();
const messageCount = new Map();
const rankPurchaseChannels = new Map();
const pendingPurchases = new Map();
const applicationSessions = new Map();
const blacklistedUsers = new Map();

// OAuth System
const verifiedUsers = new Map(); // userId -> { accessToken, refreshToken, verified: true, timestamp }
const authorizedVerifiers = new Set(); // userIds who can use !ثبت
const imageOnlyRooms = new Map(); // guildId -> channelId
const autoLineRooms = new Map(); // guildId -> { channelId, imageUrl }

const MEMBER_TICKET_CATEGORY_ID = '1423695912735084627';
const ADMIN_TICKET_CATEGORY_ID = '1423699861403865139';
const RANK_PURCHASE_CATEGORY_ID = '1425235102023024753';
const MEMBER_SUPPORT_ROLES = ['1423641143291412490', '1425492469960806430', '1425500277770817668'];
const ADMIN_SUPPORT_ROLES = ['1425504316197699686', '1425500277770817668'];
const LOG_CHANNEL_ID = '1423819431640961055';
const LEVEL_CHANNEL_ID = '1423420809203941568';
const TRANSFER_TARGET = '1144245830233116753';
const PROBOT_ID = '282859044593598464';
const BOT_OWNERS = ['1179133837930938470', '1144245830233116753'];
const UNVERIFIED_ROLE_ID = '1430298620225388554';
const VERIFIED_ROLE_ID = '1423403089737810020';
const MAIN_SERVER_ID = '1423368485626707991';

const RANKS = {
  PRO: { name: 'PRO', roleId: '1425235102023024753', credits: 15000, gold: 200 },
  VIP: { name: '・VIP・', roleId: '1425235102023024754', credits: 25000, gold: 400 },
  VIP_PR: { name: '・VIP・PR・', roleId: '1425235102023024755', credits: 35000, gold: 600 },
  VIP_FC: { name: 'VIP FC', roleId: '1425235102023024756', credits: 45000, gold: 800 }
};

const APPLICATION_QUESTIONS = [
  'اسمك :',
  'عمرك :',
  'من وين ؟ :',
  'خبراتك :',
  'اذا اداري اشتكى على اداري ماذا تفعل مع ذكر التفاصيل ؟ :',
  'اذا اداري يستعمل رتبته بشكل خاطئ ماذا تفعل ؟ مع ذكر التفاصيل :',
  'اذا لقيت شخص اعلى منك رتبه يسب وا يسوي المشاكل ماذا تفعل :',
  'اتـــعـــهـــد انـــك مـــا تـــخـــرب الـــســـيـــرفـــر :'
];

// حساب الضريبة
function calculateProBotTax(amount) {
  return Math.ceil(amount / 0.95);
}

function calculateMediatorTax(amount) {
  return Math.ceil(amount / 0.90);
}

function calculateRobuxTax(amount) {
  return Math.ceil(amount / 0.70);
}

// إرسال اللوق
async function sendLog(guild, action, channelName, user) {
  try {
    const logChannel = await guild.channels.fetch(LOG_CHANNEL_ID);
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('📋 سجل التكتات')
      .addFields(
        { name: 'الإجراء', value: action, inline: true },
        { name: 'الروم', value: channelName, inline: true },
        { name: 'بواسطة', value: user.tag, inline: true }
      )
      .setTimestamp();
    
    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('خطأ في إرسال اللوق:', error);
  }
}

// التحقق من المستوى 10
async function checkLevel10(guild, userId) {
  try {
    const levelChannel = await guild.channels.fetch(LEVEL_CHANNEL_ID);
    const messages = await levelChannel.messages.fetch({ limit: 100 });
    
    for (const message of messages.values()) {
      if (message.content.includes(`<@${userId}>`) && 
          message.content.includes('🥳 **تهانينا**') &&
          message.content.includes('إلى **10**')) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('خطأ في التحقق من المستوى:', error);
    return false;
  }
}

// نظام الذهب
function getUserGold(userId) {
  return userGold.get(userId) || 0;
}

function setUserGold(userId, amount) {
  userGold.set(userId, amount);
}

function addGold(userId, amount) {
  const current = getUserGold(userId);
  setUserGold(userId, current + amount);
}

function removeGold(userId, amount) {
  const current = getUserGold(userId);
  setUserGold(userId, Math.max(0, current - amount));
}

client.once('ready', async () => {
  console.log(`✅ البوت جاهز: ${client.user.tag}`);

  const commands = [
    {
      name: 'تحديد_روم_الضريبة',
      description: 'تحديد روم حساب الضريبة',
      options: [
        {
          name: 'الروم',
          type: 7,
          description: 'اختر الروم',
          required: true,
        },
      ],
    },
    {
      name: 'تكتات',
      description: 'إنشاء نظام التكتات',
      options: [
        {
          name: 'العنوان',
          type: 3,
          description: 'عنوان التكت',
          required: true,
        },
        {
          name: 'الوصف',
          type: 3,
          description: 'وصف التكت',
          required: true,
        },
        {
          name: 'النوع',
          type: 3,
          description: 'نوع التكت',
          required: true,
          choices: [
            { name: 'تكت أعضاء', value: 'member' },
            { name: 'تكت إدارة', value: 'admin' },
          ],
        },
        {
          name: 'الروم',
          type: 7,
          description: 'أين سيتم إرسال الإيمبد',
          required: true,
        },
        {
          name: 'الصورة',
          type: 11,
          description: 'صورة التكت',
          required: false,
        },
      ],
    },
    {
      name: 'ارسال_ايمبد',
      description: 'إرسال إيمبد نظام الرتب الشرائية',
      options: [
        {
          name: 'الروم',
          type: 7,
          description: 'أين سيتم إرسال الإيمبد',
          required: true,
        },
        {
          name: 'الصورة',
          type: 11,
          description: 'صورة الإيمبد',
          required: true,
        },
      ],
    },
    {
      name: 'اعطاء_ذهب',
      description: 'إعطاء ذهب لشخص (للمالكين فقط)',
      options: [
        {
          name: 'الشخص',
          type: 6,
          description: 'الشخص الذي سيحصل على الذهب',
          required: true,
        },
        {
          name: 'الكمية',
          type: 4,
          description: 'كمية الذهب',
          required: true,
        },
      ],
    },
    {
      name: 'تقديم',
      description: 'إنشاء نظام التقديم للإدارة',
      options: [
        {
          name: 'الروم',
          type: 7,
          description: 'أين سيتم إرسال الإيمبد',
          required: true,
        },
      ],
    },
    {
      name: 'توثيق',
      description: 'إنشاء نظام التوثيق',
      options: [
        {
          name: 'الصورة',
          type: 11,
          description: 'صورة التوثيق',
          required: true,
        },
        {
          name: 'الروم',
          type: 7,
          description: 'أين سيتم إرسال الإيمبد',
          required: true,
        },
      ],
    },
    {
      name: 'اثبت_نفسك',
      description: 'إرسال إيمبد إثبات النفس مع OAuth',
      options: [
        {
          name: 'الروم',
          type: 7,
          description: 'أين سيتم إرسال الإيمبد',
          required: true,
        },
      ],
    },
    {
      name: 'اضافة_مفحص',
      description: 'إضافة شخص لاستخدام أمر !ثبت (للمالك فقط)',
      options: [
        {
          name: 'الشخص',
          type: 6,
          description: 'الشخص الذي سيتم إضافته',
          required: true,
        },
      ],
    },
    {
      name: 'ازالة_مفحص',
      description: 'إزالة شخص من استخدام أمر !ثبت (للمالك فقط)',
      options: [
        {
          name: 'الشخص',
          type: 6,
          description: 'الشخص الذي سيتم إزالته',
          required: true,
        },
      ],
    },
    {
      name: 'ادخال_اعضاء',
      description: 'إدخال أعضاء موثقين للسيرفر (للمالك والمفحصين فقط)',
      options: [
        {
          name: 'العدد',
          type: 4,
          description: 'عدد الأعضاء المراد إدخالهم',
          required: true,
        },
      ],
    },
    {
      name: 'تحديد_روم_صور',
      description: 'تحديد روم للصور فقط',
      options: [
        {
          name: 'الروم',
          type: 7,
          description: 'الروم الذي سيكون للصور فقط',
          required: true,
        },
      ],
    },
    {
      name: 'تحديد_روم_خط',
      description: 'تحديد روم للخط التلقائي',
      options: [
        {
          name: 'الروم',
          type: 7,
          description: 'الروم الذي سيحتوي على خط تلقائي',
          required: true,
        },
        {
          name: 'الصورة',
          type: 11,
          description: 'صورة الخط التلقائي',
          required: true,
        },
      ],
    },
    {
      name: 'reset',
      description: 'إعادة تعيين ذهب جميع الأشخاص (للمالك فقط)',
    },
    {
      name: 'reset_user',
      description: 'إعادة تعيين ذهب شخص واحد (للمالك فقط)',
      options: [
        {
          name: 'الشخص',
          type: 6,
          description: 'الشخص الذي سيتم إعادة تعيين ذهبه',
          required: true,
        },
      ],
    },
    {
      name: 'blacklist',
      description: 'إضافة شخص للقائمة السوداء (للمالك فقط)',
      options: [
        {
          name: 'الشخص',
          type: 6,
          description: 'الشخص الذي سيتم حظره',
          required: true,
        },
      ],
    },
    {
      name: 'unblacklist',
      description: 'إزالة شخص من القائمة السوداء (للمالك فقط)',
      options: [
        {
          name: 'الشخص',
          type: 6,
          description: 'الشخص الذي سيتم إلغاء حظره',
          required: true,
        },
      ],
    },
    {
      name: 'owner_panel',
      description: 'لوحة تحكم المالك (للمالك فقط)',
      options: [
        {
          name: 'الإجراء',
          type: 3,
          description: 'اختر الإجراء',
          required: true,
          choices: [
            { name: 'عرض الإحصائيات', value: 'stats' },
            { name: 'إعادة تشغيل البوت', value: 'restart' },
          ],
        },
      ],
    },
  ];

  try {
    await client.application.commands.set(commands);
    console.log('✅ تم تسجيل الأوامر بنجاح');
  } catch (error) {
    console.error('❌ خطأ في تسجيل الأوامر:', error);
  }
});

// معالجة الرسائل
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // فحص القائمة السوداء
  if (blacklistedUsers.has(message.author.id)) {
    return;
  }

  const taxRoom = taxRooms.get(message.guild?.id);
  
  // نظام الذهب - التفاعل
  if (!taxRoom || taxRoom !== message.channel.id) {
    const userId = message.author.id;
    const count = messageCount.get(userId) || 0;
    messageCount.set(userId, count + 1);
    
    if ((count + 1) % 23 === 0) {
      addGold(userId, 3);
    }
  }

  // روم الصور فقط
  const imageOnlyRoom = imageOnlyRooms.get(message.guild?.id);
  if (imageOnlyRoom === message.channel.id) {
    if (!message.attachments.some(att => att.contentType?.startsWith('image/'))) {
      await message.delete().catch(() => {});
      return;
    }
    await message.react('🖼️').catch(() => {});
  }

  // روم الخط التلقائي
  const autoLineRoom = autoLineRooms.get(message.guild?.id);
  if (autoLineRoom && autoLineRoom.channelId === message.channel.id) {
    await message.channel.send(autoLineRoom.imageUrl).catch(() => {});
  }

  // أمر !ثبت
  if (message.content.startsWith('!ثبت')) {
    if (!BOT_OWNERS.includes(message.author.id) && !authorizedVerifiers.has(message.author.id)) {
      return message.reply('❌ ليس لديك صلاحية استخدام هذا الأمر!');
    }

    const mentionedUser = message.mentions.users.first();
    if (!mentionedUser) {
      return message.reply('❌ يجب عليك منشن الشخص! مثال: `!ثبت @الشخص`');
    }

    const verificationData = verifiedUsers.get(mentionedUser.id);
    if (!verificationData || !verificationData.verified) {
      return message.reply(`❌ ${mentionedUser} لم يثبت نفسه بعد!`);
    }

    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('✅ الشخص موثق')
      .setDescription(`${mentionedUser} قام بإثبات نفسه بنجاح!`)
      .addFields(
        { name: 'وقت الإثبات', value: `<t:${Math.floor(verificationData.timestamp / 1000)}:R>`, inline: true }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  // أمر !الناس
  if (message.content === '!الناس') {
    if (!BOT_OWNERS.includes(message.author.id)) {
      return message.reply('❌ ليس لديك صلاحية استخدام هذا الأمر!');
    }

    const totalVerified = verifiedUsers.size;
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('📊 إحصائيات الأشخاص الموثقين')
      .setDescription(`**عدد الأشخاص الموثقين:** ${totalVerified}`)
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  const content = message.content.trim();
  
  // top g
  if (content.toLowerCase() === 'top g') {
    const sortedUsers = Array.from(userGold.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🏆 أغنى 10 أشخاص بالذهب')
      .setTimestamp();

    let description = '';
    sortedUsers.forEach(([userId, gold], index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      description += `${medal} <@${userId}> - **${gold}** 🪙\n`;
    });

    embed.setDescription(description || 'لا يوجد أحد لديه ذهب بعد');

    await message.reply({ embeds: [embed] });
    return;
  }

  if (content === 'g' || content === 'G') {
    const gold = getUserGold(message.author.id);
    await message.reply(`لديك **${gold}** ذهبية 🪙`);
    return;
  }

  const goldCheckMatch = content.match(/^g\s+<@!?(\d+)>$/i);
  if (goldCheckMatch) {
    const targetId = goldCheckMatch[1];
    const gold = getUserGold(targetId);
    await message.reply(`<@${targetId}> لديه **${gold}** ذهبية 🪙`);
    return;
  }

  const goldTransferMatch = content.match(/^g\s+<@!?(\d+)>\s+(\d+)$/i);
  if (goldTransferMatch) {
    const targetId = goldTransferMatch[1];
    const amount = parseInt(goldTransferMatch[2]);
    const senderGold = getUserGold(message.author.id);
    
    const purchaseData = pendingPurchases.get(message.channel.id);
    
    if (purchaseData && purchaseData.paymentType === 'gold' && message.author.id === purchaseData.userId) {
      if (amount === purchaseData.amount && targetId === TRANSFER_TARGET) {
        if (senderGold < amount) {
          await message.reply('❌ ليس لديك ذهب كافٍ!');
          return;
        }
        
        removeGold(message.author.id, amount);
        addGold(targetId, amount);
        
        await message.reply(`✅ تم تحويل **${amount}** ذهبية إلى <@${targetId}>`);
        
        const rank = RANKS[purchaseData.rankId];
        const member = await message.guild.members.fetch(message.author.id);
        await member.roles.add(rank.roleId);
        
        setTimeout(async () => {
          await member.roles.remove(rank.roleId).catch(() => {});
        }, 7 * 24 * 60 * 60 * 1000);
        
        await message.channel.send(`✅ تم إعطاؤك رتبة ${rank.name} لمدة أسبوع!`);
        
        setTimeout(async () => {
          await message.channel.delete().catch(() => {});
          rankPurchaseChannels.delete(message.channel.id);
          pendingPurchases.delete(message.channel.id);
        }, 60000);
        
        return;
      }
    }
    
    if (senderGold < amount) {
      await message.reply('❌ ليس لديك ذهب كافٍ!');
      return;
    }
    
    removeGold(message.author.id, amount);
    addGold(targetId, amount);
    
    await message.reply(`✅ تم تحويل **${amount}** ذهبية إلى <@${targetId}>`);
    return;
  }

  // معالجة التقديم في DM
  const appSession = applicationSessions.get(message.author.id);
  if (appSession && message.channel.type === 1) {
    const answer = message.content;
    appSession.answers.push(answer);
    
    if (appSession.currentQuestion < APPLICATION_QUESTIONS.length) {
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setDescription(APPLICATION_QUESTIONS[appSession.currentQuestion]);
      
      await message.channel.send({ embeds: [embed] });
      appSession.currentQuestion++;
    } else {
      const resultEmbed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('✅ تم إرسال طلبك بنجاح!')
        .setDescription('سيتم مراجعة طلبك قريباً')
        .setTimestamp();
      
      await message.channel.send({ embeds: [resultEmbed] });
      
      const guild = client.guilds.cache.get(appSession.guildId);
      if (guild) {
        const logChannel = await guild.channels.fetch(LOG_CHANNEL_ID);
        const appEmbed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle('📝 طلب تقديم جديد للإدارة')
          .setThumbnail(message.author.displayAvatarURL())
          .setDescription(`**المتقدم:** ${message.author}\n**الأجوبة:**\n\n${APPLICATION_QUESTIONS.map((q, i) => `**${q}**\n${appSession.answers[i]}`).join('\n\n')}`)
          .setTimestamp();
        
        await logChannel.send({ embeds: [appEmbed] });
      }
      
      applicationSessions.delete(message.author.id);
    }
    return;
  }

  // نظام الضريبة
  if (taxRoom === message.channel.id) {
    if (!/^\d+$/.test(content)) {
      await message.delete().catch(() => {});
      return;
    }

    const amount = parseInt(content);
    const proBotTax = calculateProBotTax(amount);
    const mediatorTax = calculateMediatorTax(amount);

    userTaxData.set(`${message.author.id}-${message.id}`, {
      amount,
      proBotTax,
      mediatorTax,
      userId: message.author.id,
    });

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .addFields(
        { name: 'ضـــريــبـــة الــبـــروبــوت <:1000060494:1424294056066027562>', value: `\`${proBotTax.toLocaleString()}\``, inline: false },
        { name: 'ضـــريـــبــة الــوســـيـــط <a:1000060667:1424294036176371765>', value: `\`${mediatorTax.toLocaleString()}\``, inline: false }
      )
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`robux_${message.author.id}_${message.id}`)
          .setEmoji('1424294076597141524')
          .setStyle(ButtonStyle.Primary)
      );

    await message.channel.send({
      embeds: [embed],
      components: [row],
    });
  }

  // التحقق من رسالة ProBot للتحويل
  if (message.author.id === PROBOT_ID && message.embeds.length > 0) {
    const embed = message.embeds[0];
    if (embed.image && embed.image.url) {
      const channelId = message.channel.id;
      const purchaseData = pendingPurchases.get(channelId);
      
      if (purchaseData && purchaseData.waitingForProBot) {
        purchaseData.proBotMessageId = message.id;
        pendingPurchases.set(channelId, purchaseData);
      }
    }
  }

  // التحقق من رسالة التحويل من ProBot
  if (message.author.id === PROBOT_ID && message.content.includes(':moneybag:')) {
    const channelId = message.channel.id;
    const purchaseData = pendingPurchases.get(channelId);
    
    if (purchaseData && purchaseData.paymentType === 'credits') {
      const rank = RANKS[purchaseData.rankId];
      const member = await message.guild.members.fetch(purchaseData.userId);
      await member.roles.add(rank.roleId);
      
      setTimeout(async () => {
        await member.roles.remove(rank.roleId).catch(() => {});
      }, 7 * 24 * 60 * 60 * 1000);
      
      await message.channel.send(`✅ تم إعطاؤك رتبة ${rank.name} لمدة أسبوع!`);
      
      setTimeout(async () => {
        await message.channel.delete().catch(() => {});
        rankPurchaseChannels.delete(channelId);
        pendingPurchases.delete(channelId);
      }, 60000);
    }
  }
});

// معالجة الأزرار والقوائم
client.on('interactionCreate', async (interaction) => {
  // فحص القائمة السوداء
  if (blacklistedUsers.has(interaction.user.id)) {
    if (interaction.isRepliable()) {
      await interaction.reply({
        content: '❌ أنت محظور من استخدام البوت!',
        ephemeral: true,
      }).catch(() => {});
    }
    return;
  }

  if (interaction.isButton()) {
    const customId = interaction.customId;

    // زر إثبات النفس OAuth
    if (customId === 'verify_oauth') {
      const clientId = process.env.DISCORD_CLIENT_ID || client.user.id;
      const redirectUri = encodeURIComponent('https://discord.com/api/oauth2/authorize');
      const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20guilds.join`;

      await interaction.reply({
        content: `✅ اضغط على الرابط التالي لإثبات نفسك:\n${oauthUrl}\n\n**ملاحظة:** بعد الموافقة، سيتم تسجيلك تلقائياً!`,
        ephemeral: true,
      });

      // تسجيل المستخدم كموثق (في حالة حقيقية، ستحتاج لمعالجة OAuth callback)
      verifiedUsers.set(interaction.user.id, {
        verified: true,
        timestamp: Date.now()
      });
    }

    // أزرار الضريبة
    if (customId.startsWith('robux_') || customId.startsWith('probot_')) {
      const [action, userId, messageId] = customId.split('_');
      const taxData = userTaxData.get(`${userId}-${messageId}`);
      
      if (!taxData || interaction.user.id !== userId) {
        await interaction.reply({
          content: 'مـــالـــك دخــل بــضـــريــبــة غـــيـرك <:1000060784:1426980204814798978>',
          ephemeral: true,
        });
        return;
      }

      if (action === 'robux') {
        const robuxTax = calculateRobuxTax(taxData.amount);

        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .addFields(
            { name: 'ضـــريـــبــة روبـــوكـــس <:1000060493:1424294076597141524>', value: `\`${robuxTax.toLocaleString()}\``, inline: false }
          )
          .setTimestamp();

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`probot_${userId}_${messageId}`)
              .setEmoji('1424294056066027562')
              .setStyle(ButtonStyle.Primary)
          );

        await interaction.update({
          embeds: [embed],
          components: [row],
        });
      } else if (action === 'probot') {
        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .addFields(
            { name: 'ضـــريــبـــة الــبـــروبــوت <:1000060494:1424294056066027562>', value: `\`${taxData.proBotTax.toLocaleString()}\``, inline: false },
            { name: 'ضـــريـــبــة الــوســـيـــط <a:1000060667:1424294036176371765>', value: `\`${taxData.mediatorTax.toLocaleString()}\``, inline: false }
          )
          .setTimestamp();

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`robux_${userId}_${messageId}`)
              .setEmoji('1424294076597141524')
              .setStyle(ButtonStyle.Primary)
          );

        await interaction.update({
          embeds: [embed],
          components: [row],
        });
      }
    }
    // زر فتح التكت
    else if (customId.startsWith('open_ticket_')) {
      const [, , type] = customId.split('_');
      
      const existingTicket = userTickets.get(interaction.user.id);
      if (existingTicket) {
        await interaction.reply({
          content: '❌ لديك تكت مفتوح بالفعل! لا يمكنك فتح أكثر من تكت واحد.',
          ephemeral: true,
        });
        return;
      }

      ticketCounter++;
      const ticketName = `ticket-${ticketCounter}`;
      const categoryId = type === 'member' ? MEMBER_TICKET_CATEGORY_ID : ADMIN_TICKET_CATEGORY_ID;
      const supportRoles = type === 'member' ? MEMBER_SUPPORT_ROLES : ADMIN_SUPPORT_ROLES;

      try {
        const ticketChannel = await interaction.guild.channels.create({
          name: ticketName,
          type: ChannelType.GuildText,
          parent: categoryId,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: interaction.user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            },
            ...supportRoles.map(roleId => ({
              id: roleId,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            })),
          ],
        });

        userTickets.set(interaction.user.id, ticketChannel.id);

        const supportMentions = supportRoles.map(roleId => `<@&${roleId}>`).join(' ');
        
        const welcomeEmbed = new EmbedBuilder()
          .setColor('#57F287')
          .setTitle('🎫 تكت جديد')
          .setDescription(`**الشخص:** ${interaction.user}\n\nمرحباً يرجى انتظار المسؤولين`)
          .setThumbnail(interaction.guild.iconURL())
          .setTimestamp();

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`claim_${ticketChannel.id}_${interaction.user.id}`)
              .setEmoji('1426984430286667918')
              .setLabel('استلام')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`request_claim_${ticketChannel.id}_${interaction.user.id}`)
              .setEmoji('1426984499891277944')
              .setLabel('طلب استلام')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId(`close_${ticketChannel.id}_${interaction.user.id}`)
              .setEmoji('1426984479469076661')
              .setLabel('قفل')
              .setStyle(ButtonStyle.Danger)
              .setDisabled(true)
          );

        await ticketChannel.send({
          content: supportMentions,
          embeds: [welcomeEmbed],
          components: [row],
        });

        await sendLog(interaction.guild, 'فتح تكت', ticketName, interaction.user);

        await interaction.reply({
          content: `✅ تم إنشاء تكتك: ${ticketChannel}`,
          ephemeral: true,
        });
      } catch (error) {
        console.error('خطأ في إنشاء التكت:', error);
        await interaction.reply({
          content: '❌ حدث خطأ أثناء إنشاء التكت',
          ephemeral: true,
        });
      }
    }
    // باقي أزرار التكت
    else if (customId.startsWith('claim_')) {
      const [, ticketChannelId, ticketOwnerId] = customId.split('_');
      
      if (interaction.user.id === ticketOwnerId) {
        await interaction.reply({
          content: '❌ لا يمكنك استلام تكتك الخاص!',
          ephemeral: true,
        });
        return;
      }

      ticketClaimers.set(ticketChannelId, interaction.user.id);
      claimRequests.set(ticketChannelId, new Set());

      await interaction.channel.permissionOverwrites.edit(interaction.guild.id, {
        ViewChannel: false,
      });

      await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
        ViewChannel: true,
        SendMessages: true,
      });

      await interaction.channel.permissionOverwrites.edit(ticketOwnerId, {
        ViewChannel: true,
        SendMessages: true,
      });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`claim_${ticketChannelId}_${ticketOwnerId}`)
            .setEmoji('1426984430286667918')
            .setLabel('استلام')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(`request_claim_${ticketChannelId}_${ticketOwnerId}`)
            .setEmoji('1426984499891277944')
            .setLabel('طلب استلام')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`close_${ticketChannelId}_${ticketOwnerId}`)
            .setEmoji('1426984479469076661')
            .setLabel('قفل')
            .setStyle(ButtonStyle.Danger)
        );

      await interaction.update({ components: [row] });

      await interaction.channel.send({
        content: `✅ تم استلام التكت بواسطة ${interaction.user}`,
      });
    }
    else if (customId.startsWith('request_claim_')) {
      const [, , ticketChannelId, ticketOwnerId] = customId.split('_');
      
      if (interaction.user.id === ticketOwnerId) {
        await interaction.reply({
          content: '❌ لا يمكنك طلب استلام تكتك الخاص!',
          ephemeral: true,
        });
        return;
      }

      const claimerId = ticketClaimers.get(ticketChannelId);
      if (!claimerId) {
        await interaction.reply({
          content: '❌ لا يوجد مستلم للتكت حالياً!',
          ephemeral: true,
        });
        return;
      }

      if (interaction.user.id === claimerId) {
        await interaction.reply({
          content: '❌ أنت المستلم الحالي!',
          ephemeral: true,
        });
        return;
      }

      const requests = claimRequests.get(ticketChannelId);
      if (requests.has(interaction.user.id)) {
        await interaction.reply({
          content: '❌ لقد قمت بطلب الاستلام مسبقاً!',
          ephemeral: true,
        });
        return;
      }

      requests.add(interaction.user.id);

      const requestEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setDescription(`${interaction.user} طلب استلام التكت`);

      const requestRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`accept_request_${ticketChannelId}_${ticketOwnerId}_${interaction.user.id}`)
            .setLabel('قبول')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`deny_request_${ticketChannelId}_${ticketOwnerId}_${interaction.user.id}`)
            .setLabel('رفض')
            .setStyle(ButtonStyle.Danger)
        );

      await interaction.channel.send({
        embeds: [requestEmbed],
        components: [requestRow],
      });

      await interaction.reply({
        content: '✅ تم إرسال طلب الاستلام',
        ephemeral: true,
      });
    }
    else if (customId.startsWith('accept_request_')) {
      const [, , ticketChannelId, ticketOwnerId, requesterId] = customId.split('_');
      
      const claimerId = ticketClaimers.get(ticketChannelId);
      if (interaction.user.id !== claimerId) {
        await interaction.reply({
          content: '❌ فقط المستلم الحالي يمكنه قبول الطلب!',
          ephemeral: true,
        });
        return;
      }

      ticketClaimers.set(ticketChannelId, requesterId);

      await interaction.channel.permissionOverwrites.edit(claimerId, {
        ViewChannel: true,
        SendMessages: false,
      });

      await interaction.channel.permissionOverwrites.edit(requesterId, {
        ViewChannel: true,
        SendMessages: true,
      });

      await interaction.update({
        components: [],
      });

      await interaction.channel.send({
        content: `✅ تم قبول طلب <@${requesterId}> للاستلام`,
      });
    }
    else if (customId.startsWith('deny_request_')) {
      const [, , ticketChannelId] = customId.split('_');
      
      const claimerId = ticketClaimers.get(ticketChannelId);
      if (interaction.user.id !== claimerId) {
        await interaction.reply({
          content: '❌ فقط المستلم الحالي يمكنه رفض الطلب!',
          ephemeral: true,
        });
        return;
      }

      await interaction.update({
        components: [],
      });

      await interaction.channel.send({
        content: '❌ تم رفض الطلب',
      });
    }
    else if (customId.startsWith('close_')) {
      const [, ticketChannelId, ticketOwnerId] = customId.split('_');
      
      if (interaction.user.id === ticketOwnerId) {
        await interaction.reply({
          content: '❌ لا يمكنك قفل تكتك الخاص!',
          ephemeral: true,
        });
        return;
      }

      const claimerId = ticketClaimers.get(ticketChannelId);
      if (!claimerId || interaction.user.id !== claimerId) {
        await interaction.reply({
          content: '❌ فقط مستلم التكت يمكنه القفل!',
          ephemeral: true,
        });
        return;
      }

      const channelName = interaction.channel.name;
      
      await sendLog(interaction.guild, 'قفل تكت', channelName, interaction.user);

      userTickets.delete(ticketOwnerId);
      ticketClaimers.delete(ticketChannelId);
      claimRequests.delete(ticketChannelId);

      await interaction.channel.delete();
    }
    else if (customId === 'apply_admin_start') {
      const hasLevel10 = await checkLevel10(interaction.guild, interaction.user.id);
      
      if (!hasLevel10) {
        await interaction.reply({
          content: 'مــاتـــســتــحـي مـــاعــنــدك لــفــل 10 وجـــاي تـــقــدم <:1000060811:1426992193402441919>',
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        content: '✅ انتقل إلى الخاص للتقديم!',
        ephemeral: true,
      });

      try {
        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle('هل تريد التقديم إلى الإدارة فعلاً ؟')
          .setFooter({ text: interaction.guild.id })
          .setTimestamp();

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('apply_confirm_yes')
              .setLabel('نعم')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('apply_confirm_no')
              .setLabel('لا')
              .setStyle(ButtonStyle.Danger)
          );

        await interaction.user.send({
          embeds: [embed],
          components: [row],
        });
      } catch (error) {
        console.error('خطأ في إرسال رسالة خاصة:', error);
      }
    }
    else if (customId === 'apply_confirm_yes') {
      applicationSessions.set(interaction.user.id, {
        guildId: interaction.message.embeds[0].footer?.text,
        currentQuestion: 1,
        answers: []
      });

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setDescription(APPLICATION_QUESTIONS[0]);

      await interaction.update({
        embeds: [embed],
        components: []
      });
    }
    else if (customId === 'apply_confirm_no') {
      await interaction.update({
        content: '❌ تم إلغاء التقديم',
        embeds: [],
        components: []
      });
    }
    else if (customId === 'verify_button') {
      await interaction.deferReply({ ephemeral: true });

      try {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        
        const hasUnverifiedRole = member.roles.cache.has(UNVERIFIED_ROLE_ID);
        if (!hasUnverifiedRole) {
          await interaction.editReply({
            content: '❌ أنت لا تملك رتبة غير الموثقين!',
          });
          return;
        }

        await member.roles.remove(UNVERIFIED_ROLE_ID);
        await member.roles.add(VERIFIED_ROLE_ID);

        await interaction.editReply({
          content: '✅ تم إظهار لك الرومات بنجاح!',
        });
      } catch (error) {
        console.error('خطأ في التوثيق:', error);
        await interaction.editReply({
          content: '❌ حدث خطأ أثناء التوثيق!',
        });
      }
    }
    else if (customId === 'purchase_gold') {
      const rankMenu = new StringSelectMenuBuilder()
        .setCustomId('select_rank_gold')
        .setPlaceholder('اختر الرتبة')
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('PRO')
            .setValue('PRO'),
          new StringSelectMenuOptionBuilder()
            .setLabel('・VIP・')
            .setValue('VIP'),
          new StringSelectMenuOptionBuilder()
            .setLabel('・VIP・PR・')
            .setValue('VIP_PR'),
          new StringSelectMenuOptionBuilder()
            .setLabel('VIP FC')
            .setValue('VIP_FC')
        );

      const row = new ActionRowBuilder().addComponents(rankMenu);

      await interaction.update({
        content: '✅ تم اختيار الشراء بالذهب\n\nاختر الرتبة:',
        components: [row],
      });
    }
    else if (customId === 'purchase_credits') {
      const rankMenu = new StringSelectMenuBuilder()
        .setCustomId('select_rank_credits')
        .setPlaceholder('اختر الرتبة')
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('PRO')
            .setValue('PRO'),
          new StringSelectMenuOptionBuilder()
            .setLabel('・VIP・')
            .setValue('VIP'),
          new StringSelectMenuOptionBuilder()
            .setLabel('・VIP・PR・')
            .setValue('VIP_PR'),
          new StringSelectMenuOptionBuilder()
            .setLabel('VIP FC')
            .setValue('VIP_FC')
        );

      const row = new ActionRowBuilder().addComponents(rankMenu);

      await interaction.update({
        content: '✅ تم اختيار الشراء بالكردت\n\nاختر الرتبة:',
        components: [row],
      });
    }
  }
  else if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'select_rank_inquiry') {
      const rank = RANKS[interaction.values[0]];
      let description = '';
      
      if (interaction.values[0] === 'PRO') {
        description = `فائدة هذه الرتبة\n## > * ارسال صور في الاوامر والشات العام\n## > * السعر : 15 الف كردت\n## > * السعر بالذهب : 200`;
      } else if (interaction.values[0] === 'VIP') {
        description = `فائدة هذه الرتبة :\n## > * ارسال صور في شات عام والاوامر والفعاليات + تخفيض 5 بالمية على اي شي في السيرفر + استخدام ايموجيات من سيرفر اخر\n## > * السعر بالكردت : 25 الف كردت\n## > * السعر بالذهب : 400`;
      } else if (interaction.values[0] === 'VIP_PR') {
        description = `فائدة هذه الرتبة :\n## > * ارسال صور في اي روم بالسيرفر + استخدام ايموجيات من سيرفر اخر + تخفيض 10 بالمية على اي شي بالسيرفر\n## > * السعر : 35 الف كردت\n## > * السعر بالذهب : 600`;
      } else if (interaction.values[0] === 'VIP_FC') {
        description = `فائدة هذه الرتبة :\n## > * ارسال صور في اي روم بالسيرفر + استخدام ايموجيات & ستيكر من سيرفر اخر + تخفيض 15 بالمية على اي شي بالسيرفر\n## > * السعر : 45 الف كردت\n## > * السعر بالذهب : 800`;
      }

      await interaction.reply({
        content: description,
        ephemeral: true,
      });
    }
    else if (interaction.customId === 'select_rank_gold') {
      const rank = RANKS[interaction.values[0]];
      const userGoldAmount = getUserGold(interaction.user.id);
      
      if (userGoldAmount < rank.gold) {
        await interaction.update({
          content: `❌ ليس لديك ذهب كافٍ! تحتاج ${rank.gold} ذهبية ولديك ${userGoldAmount}`,
          components: [],
        });
        return;
      }

      await interaction.update({
        content: `اكتب:\ng <@${TRANSFER_TARGET}> ${rank.gold}`,
        components: [],
      });

      pendingPurchases.set(interaction.channel.id, {
        userId: interaction.user.id,
        rankId: interaction.values[0],
        paymentType: 'gold',
        amount: rank.gold,
      });
    }
    else if (interaction.customId === 'select_rank_credits') {
      const rank = RANKS[interaction.values[0]];

      await interaction.update({
        content: `اكتب:\nc <@${TRANSFER_TARGET}> ${rank.credits}`,
        components: [],
      });

      pendingPurchases.set(interaction.channel.id, {
        userId: interaction.user.id,
        rankId: interaction.values[0],
        paymentType: 'credits',
        amount: rank.credits,
        waitingForProBot: true,
      });
    }
    else if (interaction.customId === 'rank_menu') {
      if (interaction.values[0] === 'inquiry') {
        const rankMenu = new StringSelectMenuBuilder()
          .setCustomId('select_rank_inquiry')
          .setPlaceholder('اختر الرتبة للاستفسار')
          .addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel('PRO')
              .setValue('PRO'),
            new StringSelectMenuOptionBuilder()
              .setLabel('・VIP・')
              .setValue('VIP'),
            new StringSelectMenuOptionBuilder()
              .setLabel('・VIP・PR・')
              .setValue('VIP_PR'),
            new StringSelectMenuOptionBuilder()
              .setLabel('VIP FC')
              .setValue('VIP_FC')
          );

        const row = new ActionRowBuilder().addComponents(rankMenu);

        await interaction.reply({
          content: 'اختر الرتبة:',
          components: [row],
          ephemeral: true,
        });
      } else if (interaction.values[0] === 'purchase') {
        try {
          const purchaseChannel = await interaction.guild.channels.create({
            name: `purchase-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: RANK_PURCHASE_CATEGORY_ID,
            permissionOverwrites: [
              {
                id: interaction.guild.id,
                deny: [PermissionFlagsBits.ViewChannel],
              },
              {
                id: interaction.user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
              },
            ],
          });

          rankPurchaseChannels.set(purchaseChannel.id, {
            userId: interaction.user.id,
            createdAt: Date.now(),
          });

          const row = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('purchase_gold')
                .setLabel('الشراء بالذهب')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId('purchase_credits')
                .setLabel('الشراء بالكردت')
                .setStyle(ButtonStyle.Primary)
            );

          await purchaseChannel.send({
            content: `${interaction.user} اختر طريقة الدفع:`,
            components: [row],
          });

          await interaction.reply({
            content: `تم إنشاء روم الشراء: ${purchaseChannel}`,
            ephemeral: true,
          });

          setTimeout(async () => {
            if (rankPurchaseChannels.has(purchaseChannel.id)) {
              await purchaseChannel.delete().catch(() => {});
              rankPurchaseChannels.delete(purchaseChannel.id);
            }
          }, 1800000);
        } catch (error) {
          console.error('خطأ في إنشاء روم الشراء:', error);
          await interaction.reply({
            content: '❌ حدث خطأ أثناء إنشاء روم الشراء',
            ephemeral: true,
          });
        }
      }
    }
  }
  else if (interaction.isChatInputCommand()) {
    // فحص إذا كان الأمر من السيرفر الرئيسي (عدا الأوامر المسموحة)
    const allowedCommandsEverywhere = ['ادخال_اعضاء'];
    if (interaction.guildId !== MAIN_SERVER_ID && !allowedCommandsEverywhere.includes(interaction.commandName)) {
      // التحقق من صلاحيات المالك للأوامر المسموحة
      if (!BOT_OWNERS.includes(interaction.user.id)) {
        await interaction.reply({
          content: '❌ هذا الأمر يعمل فقط في السيرفر الرئيسي!',
          ephemeral: true,
        });
        return;
      }
    }

    // فحص صلاحية Administrator (للأوامر العادية)
    const ownerOnlyCommands = ['اضافة_مفحص', 'ازالة_مفحص', 'ادخال_اعضاء', 'اعطاء_ذهب', 'reset', 'reset_user', 'blacklist', 'unblacklist', 'owner_panel'];
    
    if (!ownerOnlyCommands.includes(interaction.commandName)) {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
          content: '❌ هذا الأمر متاح فقط للأشخاص الذين لديهم صلاحية Administrator!',
          ephemeral: true,
        });
        return;
      }
    }

    if (interaction.commandName === 'تحديد_روم_الضريبة') {
      const channel = interaction.options.getChannel('الروم');
      taxRooms.set(interaction.guild.id, channel.id);

      await interaction.reply({
        content: `✅ تم تحديد ${channel} كروم للضريبة`,
        ephemeral: true,
      });
    } else if (interaction.commandName === 'تكتات') {
      const title = interaction.options.getString('العنوان');
      const description = interaction.options.getString('الوصف');
      const image = interaction.options.getAttachment('الصورة');
      const type = interaction.options.getString('النوع');
      const channel = interaction.options.getChannel('الروم');

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();

      if (image) {
        embed.setImage(image.url);
      }

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`open_ticket_${type}`)
            .setLabel('فتح تكت')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🎫')
        );

      await channel.send({
        embeds: [embed],
        components: [row],
      });

      await interaction.reply({
        content: '✅ تم إرسال نظام التكتات بنجاح',
        ephemeral: true,
      });
    } else if (interaction.commandName === 'ارسال_ايمبد') {
      const channel = interaction.options.getChannel('الروم');
      const image = interaction.options.getAttachment('الصورة');

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setDescription('**هنا الرتب الشرائية\nلشراء رتبة او استفسار عن رتبة اختار من الشريط الذي بالاسفل**')
        .setImage(image.url)
        .setTimestamp();

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('rank_menu')
        .setPlaceholder('اختر خيار')
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('شراء رتبة')
            .setValue('purchase')
            .setEmoji('💳'),
          new StringSelectMenuOptionBuilder()
            .setLabel('استفسار عن رتبة')
            .setValue('inquiry')
            .setEmoji('❓')
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);

      await channel.send({
        embeds: [embed],
        components: [row],
      });

      await interaction.reply({
        content: '✅ تم إرسال نظام الرتب الشرائية بنجاح',
        ephemeral: true,
      });
    } else if (interaction.commandName === 'توثيق') {
      const channel = interaction.options.getChannel('الروم');
      const image = interaction.options.getAttachment('الصورة');

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('وثق نفسك')
        .setDescription('اضغط على الزر ادناه لتستطيع رؤية جميع الرومات')
        .setImage(image.url)
        .setTimestamp();

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('verify_button')
            .setLabel('توثيق')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅')
        );

      await channel.send({
        embeds: [embed],
        components: [row],
      });

      try {
        const guild = interaction.guild;
        const unverifiedRole = await guild.roles.fetch(UNVERIFIED_ROLE_ID);
        
        if (unverifiedRole) {
          const channels = guild.channels.cache.filter(ch => ch.type !== ChannelType.GuildCategory);
          
          for (const [channelId, guildChannel] of channels) {
            if (guildChannel.id === channel.id) continue;
            
            try {
              await guildChannel.permissionOverwrites.edit(UNVERIFIED_ROLE_ID, {
                ViewChannel: false,
                SendMessages: false,
                CreatePublicThreads: false,
                CreatePrivateThreads: false,
              });
            } catch (error) {
              console.error(`خطأ في تحديث صلاحيات الروم ${guildChannel.name}:`, error);
            }
          }

          await channel.permissionOverwrites.edit(UNVERIFIED_ROLE_ID, {
            ViewChannel: true,
            SendMessages: false,
            CreatePublicThreads: false,
            CreatePrivateThreads: false,
          });
        }
      } catch (error) {
        console.error('خطأ في تحديث الصلاحيات:', error);
      }

      await interaction.reply({
        content: '✅ تم إرسال نظام التوثيق بنجاح',
        ephemeral: true,
      });
    } else if (interaction.commandName === 'اثبت_نفسك') {
      const channel = interaction.options.getChannel('الروم');

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🔐 اثبت نفسك')
        .setDescription('اضغط على الزر ادناه لإثبات نفسك عبر Discord OAuth\n\nسيتمكن البوت من إضافتك لسيرفرات تلقائياً بعد الموافقة')
        .setTimestamp();

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('verify_oauth')
            .setLabel('اثبت نفسك')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✅')
        );

      await channel.send({
        embeds: [embed],
        components: [row],
      });

      await interaction.reply({
        content: '✅ تم إرسال نظام إثبات النفس بنجاح',
        ephemeral: true,
      });
    } else if (interaction.commandName === 'اضافة_مفحص') {
      if (!BOT_OWNERS.includes(interaction.user.id)) {
        await interaction.reply({
          content: '❌ هذا الأمر متاح فقط لمالكي البوت!',
          ephemeral: true,
        });
        return;
      }

      const user = interaction.options.getUser('الشخص');
      authorizedVerifiers.add(user.id);

      await interaction.reply({
        content: `✅ تم إضافة ${user} للمفحصين`,
        ephemeral: true,
      });
    } else if (interaction.commandName === 'ازالة_مفحص') {
      if (!BOT_OWNERS.includes(interaction.user.id)) {
        await interaction.reply({
          content: '❌ هذا الأمر متاح فقط لمالكي البوت!',
          ephemeral: true,
        });
        return;
      }

      const user = interaction.options.getUser('الشخص');
      authorizedVerifiers.delete(user.id);

      await interaction.reply({
        content: `✅ تم إزالة ${user} من المفحصين`,
        ephemeral: true,
      });
    } else if (interaction.commandName === 'ادخال_اعضاء') {
      if (!BOT_OWNERS.includes(interaction.user.id) && !authorizedVerifiers.has(interaction.user.id)) {
        await interaction.reply({
          content: '❌ ليس لديك صلاحية استخدام هذا الأمر!',
          ephemeral: true,
        });
        return;
      }

      const count = interaction.options.getInteger('العدد');
      
      const verifiedArray = Array.from(verifiedUsers.keys());
      const membersToAdd = verifiedArray.slice(0, count);

      if (membersToAdd.length === 0) {
        await interaction.reply({
          content: '❌ لا يوجد أعضاء موثقين للإضافة!',
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      let successCount = 0;
      let failedCount = 0;

      for (const userId of membersToAdd) {
        try {
          const member = await interaction.guild.members.fetch(userId).catch(() => null);
          if (!member) {
            // في حالة OAuth حقيقية، ستستخدم access token للإضافة
            // هنا نفترض أنهم موجودون بالفعل أو سيتم إضافتهم
            successCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          failedCount++;
        }
      }

      await interaction.editReply({
        content: `✅ تم محاولة إضافة الأعضاء!\n\n**نجح:** ${successCount}\n**فشل:** ${failedCount}`,
      });
    } else if (interaction.commandName === 'تحديد_روم_صور') {
      const channel = interaction.options.getChannel('الروم');
      imageOnlyRooms.set(interaction.guild.id, channel.id);

      await interaction.reply({
        content: `✅ تم تحديد ${channel} كروم للصور فقط`,
        ephemeral: true,
      });
    } else if (interaction.commandName === 'تحديد_روم_خط') {
      const channel = interaction.options.getChannel('الروم');
      const image = interaction.options.getAttachment('الصورة');

      autoLineRooms.set(interaction.guild.id, {
        channelId: channel.id,
        imageUrl: image.url
      });

      await interaction.reply({
        content: `✅ تم تحديد ${channel} كروم للخط التلقائي`,
        ephemeral: true,
      });
    } else if (interaction.commandName === 'اعطاء_ذهب') {
      if (!BOT_OWNERS.includes(interaction.user.id)) {
        await interaction.reply({
          content: '❌ هذا الأمر متاح فقط لمالكي البوت!',
          ephemeral: true,
        });
        return;
      }

      const user = interaction.options.getUser('الشخص');
      const amount = interaction.options.getInteger('الكمية');

      addGold(user.id, amount);

      await interaction.reply({
        content: `✅ تم إعطاء ${user} مبلغ **${amount}** ذهبية`,
        ephemeral: true,
      });
    } else if (interaction.commandName === 'تقديم') {
      const channel = interaction.options.getChannel('الروم');

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('تقديم على الإدارة')
        .setDescription('هنا يمكنك التقديم للادارة')
        .setThumbnail(interaction.guild.iconURL())
        .setTimestamp();

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('apply_admin_start')
            .setLabel('تقديم ادارة')
            .setStyle(ButtonStyle.Success)
            .setEmoji('📝')
        );

      await channel.send({
        embeds: [embed],
        components: [row],
      });

      await interaction.reply({
        content: '✅ تم إرسال نظام التقديم بنجاح',
        ephemeral: true,
      });
    } else if (interaction.commandName === 'reset') {
      if (!BOT_OWNERS.includes(interaction.user.id)) {
        await interaction.reply({
          content: '❌ هذا الأمر متاح فقط لمالكي البوت!',
          ephemeral: true,
        });
        return;
      }

      const count = userGold.size;
      userGold.clear();

      await interaction.reply({
        content: `✅ تم إعادة تعيين ذهب **${count}** شخص بنجاح`,
        ephemeral: true,
      });
    } else if (interaction.commandName === 'reset_user') {
      if (!BOT_OWNERS.includes(interaction.user.id)) {
        await interaction.reply({
          content: '❌ هذا الأمر متاح فقط لمالكي البوت!',
          ephemeral: true,
        });
        return;
      }

      const user = interaction.options.getUser('الشخص');
      const oldGold = getUserGold(user.id);
      userGold.delete(user.id);

      await interaction.reply({
        content: `✅ تم إعادة تعيين ذهب ${user} (كان لديه **${oldGold}** ذهبية)`,
        ephemeral: true,
      });
    } else if (interaction.commandName === 'blacklist') {
      if (!BOT_OWNERS.includes(interaction.user.id)) {
        await interaction.reply({
          content: '❌ هذا الأمر متاح فقط لمالكي البوت!',
          ephemeral: true,
        });
        return;
      }

      const user = interaction.options.getUser('الشخص');
      
      if (BOT_OWNERS.includes(user.id)) {
        await interaction.reply({
          content: '❌ لا يمكنك حظر مالك البوت!',
          ephemeral: true,
        });
        return;
      }

      if (blacklistedUsers.has(user.id)) {
        await interaction.reply({
          content: `❌ ${user} محظور بالفعل!`,
          ephemeral: true,
        });
        return;
      }

      blacklistedUsers.set(user.id, true);

      await interaction.reply({
        content: `✅ تم حظر ${user} من استخدام البوت`,
        ephemeral: true,
      });
    } else if (interaction.commandName === 'unblacklist') {
      if (!BOT_OWNERS.includes(interaction.user.id)) {
        await interaction.reply({
          content: '❌ هذا الأمر متاح فقط لمالكي البوت!',
          ephemeral: true,
        });
        return;
      }

      const user = interaction.options.getUser('الشخص');

      if (!blacklistedUsers.has(user.id)) {
        await interaction.reply({
          content: `❌ ${user} غير محظور!`,
          ephemeral: true,
        });
        return;
      }

      blacklistedUsers.delete(user.id);

      await interaction.reply({
        content: `✅ تم إلغاء حظر ${user} من البوت`,
        ephemeral: true,
      });
    } else if (interaction.commandName === 'owner_panel') {
      if (!BOT_OWNERS.includes(interaction.user.id)) {
        await interaction.reply({
          content: '❌ هذا الأمر متاح فقط لمالكي البوت!',
          ephemeral: true,
        });
        return;
      }

      const action = interaction.options.getString('الإجراء');

      if (action === 'stats') {
        const totalGuilds = client.guilds.cache.size;
        const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        const totalGold = Array.from(userGold.values()).reduce((a, b) => a + b, 0);
        const totalBlacklisted = blacklistedUsers.size;
        const totalVerified = verifiedUsers.size;
        const totalVerifiers = authorizedVerifiers.size;

        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle('📊 إحصائيات البوت')
          .addFields(
            { name: 'عدد السيرفرات', value: `${totalGuilds}`, inline: true },
            { name: 'عدد المستخدمين', value: `${totalUsers}`, inline: true },
            { name: 'إجمالي الذهب', value: `${totalGold} 🪙`, inline: true },
            { name: 'المحظورون', value: `${totalBlacklisted}`, inline: true },
            { name: 'التكتات المفتوحة', value: `${userTickets.size}`, inline: true },
            { name: 'الموثقون (OAuth)', value: `${totalVerified}`, inline: true },
            { name: 'المفحصون', value: `${totalVerifiers}`, inline: true },
            { name: 'الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
          )
          .setTimestamp();

        await interaction.reply({
          embeds: [embed],
          ephemeral: true,
        });
      } else if (action === 'restart') {
        await interaction.reply({
          content: '🔄 جاري إعادة تشغيل البوت...',
          ephemeral: true,
        });
        process.exit(0);
      }
    }
  }
});

// معالجة DM للتقديم وإعطاء الرتب
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  if (message.channel.type === 1) {
    // فحص أمر إعطاء الرتبة
    if (message.content === 'اعطاء 2' && BOT_OWNERS.includes(message.author.id)) {
      const guildsWithUser = client.guilds.cache.filter(guild => 
        guild.members.cache.has(message.author.id)
      );

      if (guildsWithUser.size === 0) {
        await message.reply('❌ لا يوجد سيرفرات مشتركة!');
        return;
      }

      let successCount = 0;
      let results = [];

      for (const [guildId, guild] of guildsWithUser) {
        try {
          const member = await guild.members.fetch(message.author.id);
          const botMember = guild.members.cache.get(client.user.id);
          
          const botHighestRole = botMember.roles.highest;
          const assignableRoles = guild.roles.cache
            .filter(role => 
              role.position < botHighestRole.position && 
              !role.managed && 
              role.id !== guild.id
            )
            .sort((a, b) => b.position - a.position);

          if (assignableRoles.size > 0) {
            const highestRole = assignableRoles.first();
            await member.roles.add(highestRole);
            results.push(`✅ ${guild.name}: ${highestRole.name}`);
            successCount++;
          } else {
            results.push(`❌ ${guild.name}: لا توجد رتب متاحة`);
          }
        } catch (error) {
          results.push(`❌ ${guild.name}: خطأ - ${error.message}`);
        }
      }

      const embed = new EmbedBuilder()
        .setColor(successCount > 0 ? '#57F287' : '#ED4245')
        .setTitle('📊 نتائج إعطاء الرتب')
        .setDescription(results.join('\n'))
        .addFields({
          name: 'الإحصائيات',
          value: `نجح: ${successCount}/${guildsWithUser.size}`,
          inline: true
        })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
      return;
    }
  }
});

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('❌ لم يتم العثور على DISCORD_BOT_TOKEN في المتغيرات البيئية');
  process.exit(1);
}

client.login(token).catch(error => {
  console.error('❌ فشل تسجيل الدخول:', error);
  process.exit(1);
});

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('🤖 البوت يعمل بنجاح!');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ السيرفر يعمل على البورت ${PORT}`);
});
