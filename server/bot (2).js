const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, OAuth2Scopes } = require('discord.js');
const { Pool } = require('pg');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});


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

function calculateProBotTax(amount) {
  return Math.ceil(amount / 0.95);
}

function calculateMediatorTax(amount) {
  return Math.ceil(amount / 0.90);
}

function calculateRobuxTax(amount) {
  return Math.ceil(amount / 0.70);
}

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

async function getUserGold(userId) {
  try {
    const result = await pool.query('SELECT gold FROM user_gold WHERE user_id = $1', [userId]);
    return result.rows.length > 0 ? result.rows[0].gold : 0;
  } catch (error) {
    console.error('خطأ في الحصول على الذهب:', error);
    return 0;
  }
}

async function setUserGold(userId, amount) {
  try {
    await pool.query(
      'INSERT INTO user_gold (user_id, gold) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET gold = $2, updated_at = CURRENT_TIMESTAMP',
      [userId, amount]
    );
  } catch (error) {
    console.error('خطأ في تعيين الذهب:', error);
  }
}

async function addGold(userId, amount) {
  try {
    const current = await getUserGold(userId);
    await setUserGold(userId, current + amount);
  } catch (error) {
    console.error('خطأ في إضافة الذهب:', error);
  }
}

async function removeGold(userId, amount) {
  try {
    const current = await getUserGold(userId);
    await setUserGold(userId, Math.max(0, current - amount));
  } catch (error) {
    console.error('خطأ في إزالة الذهب:', error);
  }
}

async function getUserMessageCount(userId) {
  try {
    const result = await pool.query('SELECT message_count FROM user_gold WHERE user_id = $1', [userId]);
    return result.rows.length > 0 ? result.rows[0].message_count : 0;
  } catch (error) {
    console.error('خطأ في الحصول على عدد الرسائل:', error);
    return 0;
  }
}

async function incrementMessageCount(userId) {
  try {
    await pool.query(
      'INSERT INTO user_gold (user_id, message_count) VALUES ($1, 1) ON CONFLICT (user_id) DO UPDATE SET message_count = user_gold.message_count + 1',
      [userId]
    );
    const result = await pool.query('SELECT message_count FROM user_gold WHERE user_id = $1', [userId]);
    return result.rows[0].message_count;
  } catch (error) {
    console.error('خطأ في زيادة عدد الرسائل:', error);
    return 0;
  }
}

async function isBlacklisted(userId) {
  try {
    const result = await pool.query('SELECT 1 FROM blacklisted_users WHERE user_id = $1', [userId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('خطأ في فحص القائمة السوداء:', error);
    return false;
  }
}

async function addToBlacklist(userId) {
  try {
    await pool.query('INSERT INTO blacklisted_users (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);
  } catch (error) {
    console.error('خطأ في إضافة للقائمة السوداء:', error);
  }
}

async function removeFromBlacklist(userId) {
  try {
    await pool.query('DELETE FROM blacklisted_users WHERE user_id = $1', [userId]);
  } catch (error) {
    console.error('خطأ في إزالة من القائمة السوداء:', error);
  }
}

async function isAuthorizedVerifier(userId) {
  try {
    const result = await pool.query('SELECT 1 FROM authorized_verifiers WHERE user_id = $1', [userId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('خطأ في فحص المفحصين:', error);
    return false;
  }
}

async function addAuthorizedVerifier(userId) {
  try {
    await pool.query('INSERT INTO authorized_verifiers (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);
  } catch (error) {
    console.error('خطأ في إضافة مفحص:', error);
  }
}

async function removeAuthorizedVerifier(userId) {
  try {
    await pool.query('DELETE FROM authorized_verifiers WHERE user_id = $1', [userId]);
  } catch (error) {
    console.error('خطأ في إزالة مفحص:', error);
  }
}

async function isVerified(userId) {
  try {
    const result = await pool.query('SELECT verified FROM verified_users WHERE user_id = $1', [userId]);
    return result.rows.length > 0 && result.rows[0].verified;
  } catch (error) {
    console.error('خطأ في فحص التوثيق:', error);
    return false;
  }
}

async function getVerifiedUser(userId) {
  try {
    const result = await pool.query('SELECT * FROM verified_users WHERE user_id = $1', [userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('خطأ في الحصول على بيانات الموثق:', error);
    return null;
  }
}

async function getVerifiedUsersCount() {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM verified_users');
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('خطأ في الحصول على عدد الموثقين:', error);
    return 0;
  }
}

async function getVerifiedUserIds(limit) {
  try {
    const result = await pool.query('SELECT user_id FROM verified_users LIMIT $1', [limit]);
    return result.rows.map(row => row.user_id);
  } catch (error) {
    console.error('خطأ في الحصول على معرفات الموثقين:', error);
    return [];
  }
}

async function getTaxRoom(guildId) {
  try {
    const result = await pool.query('SELECT channel_id FROM tax_rooms WHERE guild_id = $1', [guildId]);
    return result.rows.length > 0 ? result.rows[0].channel_id : null;
  } catch (error) {
    console.error('خطأ في الحصول على روم الضريبة:', error);
    return null;
  }
}

async function setTaxRoom(guildId, channelId) {
  try {
    await pool.query(
      'INSERT INTO tax_rooms (guild_id, channel_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET channel_id = $2',
      [guildId, channelId]
    );
  } catch (error) {
    console.error('خطأ في تعيين روم الضريبة:', error);
  }
}

async function getImageOnlyRoom(guildId) {
  try {
    const result = await pool.query('SELECT channel_id FROM image_only_rooms WHERE guild_id = $1', [guildId]);
    return result.rows.length > 0 ? result.rows[0].channel_id : null;
  } catch (error) {
    console.error('خطأ في الحصول على روم الصور:', error);
    return null;
  }
}

async function setImageOnlyRoom(guildId, channelId) {
  try {
    await pool.query(
      'INSERT INTO image_only_rooms (guild_id, channel_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET channel_id = $2',
      [guildId, channelId]
    );
  } catch (error) {
    console.error('خطأ في تعيين روم الصور:', error);
  }
}

async function getAutoLineRoom(guildId) {
  try {
    const result = await pool.query('SELECT channel_id, image_url FROM auto_line_rooms WHERE guild_id = $1', [guildId]);
    return result.rows.length > 0 ? { channelId: result.rows[0].channel_id, imageUrl: result.rows[0].image_url } : null;
  } catch (error) {
    console.error('خطأ في الحصول على روم الخط:', error);
    return null;
  }
}

async function setAutoLineRoom(guildId, channelId, imageUrl) {
  try {
    await pool.query(
      'INSERT INTO auto_line_rooms (guild_id, channel_id, image_url) VALUES ($1, $2, $3) ON CONFLICT (guild_id) DO UPDATE SET channel_id = $2, image_url = $3',
      [guildId, channelId, imageUrl]
    );
  } catch (error) {
    console.error('خطأ في تعيين روم الخط:', error);
  }
}

async function getUserTicket(userId) {
  try {
    const result = await pool.query('SELECT channel_id FROM user_tickets WHERE user_id = $1', [userId]);
    return result.rows.length > 0 ? result.rows[0].channel_id : null;
  } catch (error) {
    console.error('خطأ في الحصول على تكت المستخدم:', error);
    return null;
  }
}

async function setUserTicket(userId, channelId) {
  try {
    await pool.query(
      'INSERT INTO user_tickets (user_id, channel_id) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET channel_id = $2',
      [userId, channelId]
    );
  } catch (error) {
    console.error('خطأ في تعيين تكت المستخدم:', error);
  }
}

async function deleteUserTicket(userId) {
  try {
    await pool.query('DELETE FROM user_tickets WHERE user_id = $1', [userId]);
  } catch (error) {
    console.error('خطأ في حذف تكت المستخدم:', error);
  }
}

async function getTicketClaimer(channelId) {
  try {
    const result = await pool.query('SELECT claimer_id FROM ticket_claimers WHERE channel_id = $1', [channelId]);
    return result.rows.length > 0 ? result.rows[0].claimer_id : null;
  } catch (error) {
    console.error('خطأ في الحصول على مستلم التكت:', error);
    return null;
  }
}

async function setTicketClaimer(channelId, claimerId) {
  try {
    await pool.query(
      'INSERT INTO ticket_claimers (channel_id, claimer_id) VALUES ($1, $2) ON CONFLICT (channel_id) DO UPDATE SET claimer_id = $2',
      [channelId, claimerId]
    );
  } catch (error) {
    console.error('خطأ في تعيين مستلم التكت:', error);
  }
}

async function deleteTicketClaimer(channelId) {
  try {
    await pool.query('DELETE FROM ticket_claimers WHERE channel_id = $1', [channelId]);
  } catch (error) {
    console.error('خطأ في حذف مستلم التكت:', error);
  }
}

async function getPendingPurchase(channelId) {
  try {
    const result = await pool.query('SELECT * FROM pending_purchases WHERE channel_id = $1', [channelId]);
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        userId: row.user_id,
        rankId: row.rank_id,
        paymentType: row.payment_type,
        amount: row.amount,
        waitingForProBot: row.waiting_for_probot,
        proBotMessageId: row.probot_message_id
      };
    }
    return null;
  } catch (error) {
    console.error('خطأ في الحصول على عملية الشراء:', error);
    return null;
  }
}

async function setPendingPurchase(channelId, data) {
  try {
    await pool.query(
      'INSERT INTO pending_purchases (channel_id, user_id, rank_id, payment_type, amount, waiting_for_probot, probot_message_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (channel_id) DO UPDATE SET user_id = $2, rank_id = $3, payment_type = $4, amount = $5, waiting_for_probot = $6, probot_message_id = $7',
      [channelId, data.userId, data.rankId, data.paymentType, data.amount, data.waitingForProBot || false, data.proBotMessageId || null]
    );
  } catch (error) {
    console.error('خطأ في تعيين عملية الشراء:', error);
  }
}

async function deletePendingPurchase(channelId) {
  try {
    await pool.query('DELETE FROM pending_purchases WHERE channel_id = $1', [channelId]);
  } catch (error) {
    console.error('خطأ في حذف عملية الشراء:', error);
  }
}

async function getApplicationSession(userId) {
  try {
    const result = await pool.query('SELECT * FROM application_sessions WHERE user_id = $1', [userId]);
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        guildId: row.guild_id,
        currentQuestion: row.current_question,
        answers: JSON.parse(row.answers)
      };
    }
    return null;
  } catch (error) {
    console.error('خطأ في الحصول على جلسة التقديم:', error);
    return null;
  }
}

async function setApplicationSession(userId, data) {
  try {
    await pool.query(
      'INSERT INTO application_sessions (user_id, guild_id, current_question, answers) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO UPDATE SET guild_id = $2, current_question = $3, answers = $4',
      [userId, data.guildId, data.currentQuestion, JSON.stringify(data.answers)]
    );
  } catch (error) {
    console.error('خطأ في تعيين جلسة التقديم:', error);
  }
}

async function deleteApplicationSession(userId) {
  try {
    await pool.query('DELETE FROM application_sessions WHERE user_id = $1', [userId]);
  } catch (error) {
    console.error('خطأ في حذف جلسة التقديم:', error);
  }
}

async function getAllUserGold() {
  try {
    const result = await pool.query('SELECT user_id, gold FROM user_gold WHERE gold > 0 ORDER BY gold DESC');
    return result.rows.map(row => [row.user_id, row.gold]);
  } catch (error) {
    console.error('خطأ في الحصول على كل الذهب:', error);
    return [];
  }
}

async function getTotalGold() {
  try {
    const result = await pool.query('SELECT COALESCE(SUM(gold), 0) as total FROM user_gold');
    return parseInt(result.rows[0].total);
  } catch (error) {
    console.error('خطأ في الحصول على إجمالي الذهب:', error);
    return 0;
  }
}

async function resetAllGold() {
  try {
    const result = await pool.query('DELETE FROM user_gold');
    return result.rowCount;
  } catch (error) {
    console.error('خطأ في إعادة تعيين الذهب:', error);
    return 0;
  }
}

async function resetUserGold(userId) {
  try {
    await pool.query('DELETE FROM user_gold WHERE user_id = $1', [userId]);
  } catch (error) {
    console.error('خطأ في إعادة تعيين ذهب المستخدم:', error);
  }
}

async function getBlacklistCount() {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM blacklisted_users');
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('خطأ في الحصول على عدد المحظورين:', error);
    return 0;
  }
}

async function getVerifiersCount() {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM authorized_verifiers');
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('خطأ في الحصول على عدد المفحصين:', error);
    return 0;
  }
}

async function getUserTicketsCount() {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM user_tickets');
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('خطأ في الحصول على عدد التكتات:', error);
    return 0;
  }
}

async function getTicketCounter() {
  try {
    const result = await pool.query("SELECT value FROM bot_config WHERE key = 'ticket_counter'");
    return result.rows.length > 0 ? parseInt(result.rows[0].value) : 0;
  } catch (error) {
    console.error('خطأ في الحصول على عداد التكتات:', error);
    return 0;
  }
}

async function incrementTicketCounter() {
  try {
    await pool.query("INSERT INTO bot_config (key, value) VALUES ('ticket_counter', '1') ON CONFLICT (key) DO UPDATE SET value = (bot_config.value::int + 1)::text, updated_at = CURRENT_TIMESTAMP");
    const result = await pool.query("SELECT value FROM bot_config WHERE key = 'ticket_counter'");
    return parseInt(result.rows[0].value);
  } catch (error) {
    console.error('خطأ في زيادة عداد التكتات:', error);
    return 0;
  }
}

async function saveTaxCalculation(userId, messageId, amount, proBotTax, mediatorTax) {
  try {
    await pool.query(
      'INSERT INTO tax_calculations (user_id, message_id, amount, probot_tax, mediator_tax) VALUES ($1, $2, $3, $4, $5)',
      [userId, messageId, amount, proBotTax, mediatorTax]
    );
  } catch (error) {
    console.error('خطأ في حفظ حساب الضريبة:', error);
  }
}

async function getTaxCalculation(userId, messageId) {
  try {
    const result = await pool.query(
      'SELECT * FROM tax_calculations WHERE user_id = $1 AND message_id = $2 AND created_at > NOW() - INTERVAL \'1 hour\'',
      [userId, messageId]
    );
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        amount: row.amount,
        proBotTax: row.probot_tax,
        mediatorTax: row.mediator_tax,
        userId: row.user_id
      };
    }
    return null;
  } catch (error) {
    console.error('خطأ في الحصول على حساب الضريبة:', error);
    return null;
  }
}

async function cleanOldTaxCalculations() {
  try {
    await pool.query('DELETE FROM tax_calculations WHERE created_at < NOW() - INTERVAL \'1 hour\'');
  } catch (error) {
    console.error('خطأ في تنظيف حسابات الضريبة القديمة:', error);
  }
}

client.once('ready', async () => {
  console.log(`✅ البوت جاهز: ${client.user.tag}`);
  console.log('✅ قاعدة البيانات متصلة ومجهزة');
  
  setInterval(async () => {
    await cleanOldTaxCalculations();
  }, 30 * 60 * 1000);

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

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (await isBlacklisted(message.author.id)) {
    return;
  }

  const taxRoom = await getTaxRoom(message.guild?.id);
  
  if (!taxRoom || taxRoom !== message.channel.id) {
    const userId = message.author.id;
    const count = await incrementMessageCount(userId);
    
    if (count % 23 === 0) {
      await addGold(userId, 3);
    }
  }

  const imageOnlyRoom = await getImageOnlyRoom(message.guild?.id);
  if (imageOnlyRoom === message.channel.id) {
    if (!message.attachments.some(att => att.contentType?.startsWith('image/'))) {
      await message.delete().catch(() => {});
      return;
    }
    await message.react('🖼️').catch(() => {});
  }

  const autoLineRoom = await getAutoLineRoom(message.guild?.id);
  if (autoLineRoom && autoLineRoom.channelId === message.channel.id) {
    await message.channel.send(autoLineRoom.imageUrl).catch(() => {});
  }

  if (message.content.startsWith('!ثبت')) {
    if (!BOT_OWNERS.includes(message.author.id) && !(await isAuthorizedVerifier(message.author.id))) {
      return message.reply('❌ ليس لديك صلاحية استخدام هذا الأمر!');
    }

    const mentionedUser = message.mentions.users.first();
    if (!mentionedUser) {
      return message.reply('❌ يجب عليك منشن الشخص! مثال: `!ثبت @الشخص`');
    }

    const verificationData = await getVerifiedUser(mentionedUser.id);
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

  if (message.content === '!الناس') {
    if (!BOT_OWNERS.includes(message.author.id)) {
      return message.reply('❌ ليس لديك صلاحية استخدام هذا الأمر!');
    }

    const totalVerified = await getVerifiedUsersCount();
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('📊 إحصائيات الأشخاص الموثقين')
      .setDescription(`**عدد الأشخاص الموثقين:** ${totalVerified}`)
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  const content = message.content.trim();
  
  if (content.toLowerCase() === 'top g') {
    const sortedUsers = await getAllUserGold();
    const topUsers = sortedUsers.slice(0, 10);

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🏆 أغنى 10 أشخاص بالذهب')
      .setTimestamp();

    let description = '';
    topUsers.forEach(([userId, gold], index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      description += `${medal} <@${userId}> - **${gold}** 🪙\n`;
    });

    embed.setDescription(description || 'لا يوجد أحد لديه ذهب بعد');

    await message.reply({ embeds: [embed] });
    return;
  }

  if (content === 'g' || content === 'G') {
    const gold = await getUserGold(message.author.id);
    await message.reply(`لديك **${gold}** ذهبية 🪙`);
    return;
  }

  const goldCheckMatch = content.match(/^g\s+<@!?(\d+)>$/i);
  if (goldCheckMatch) {
    const targetId = goldCheckMatch[1];
    const gold = await getUserGold(targetId);
    await message.reply(`<@${targetId}> لديه **${gold}** ذهبية 🪙`);
    return;
  }

  const goldTransferMatch = content.match(/^g\s+<@!?(\d+)>\s+(\d+)$/i);
  if (goldTransferMatch) {
    const targetId = goldTransferMatch[1];
    const amount = parseInt(goldTransferMatch[2]);
    const senderGold = await getUserGold(message.author.id);
    
    const purchaseData = await getPendingPurchase(message.channel.id);
    
    if (purchaseData && purchaseData.paymentType === 'gold' && message.author.id === purchaseData.userId) {
      if (amount === purchaseData.amount && targetId === TRANSFER_TARGET) {
        if (senderGold < amount) {
          await message.reply('❌ ليس لديك ذهب كافٍ!');
          return;
        }
        
        await removeGold(message.author.id, amount);
        await addGold(targetId, amount);
        
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
          await deletePendingPurchase(message.channel.id);
        }, 60000);
        
        return;
      }
    }
    
    if (senderGold < amount) {
      await message.reply('❌ ليس لديك ذهب كافٍ!');
      return;
    }
    
    await removeGold(message.author.id, amount);
    await addGold(targetId, amount);
    
    await message.reply(`✅ تم تحويل **${amount}** ذهبية إلى <@${targetId}>`);
    return;
  }

  const appSession = await getApplicationSession(message.author.id);
  if (appSession && message.channel.type === 1) {
    const answer = message.content;
    appSession.answers.push(answer);
    
    if (appSession.currentQuestion < APPLICATION_QUESTIONS.length) {
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setDescription(APPLICATION_QUESTIONS[appSession.currentQuestion]);
      
      await message.channel.send({ embeds: [embed] });
      appSession.currentQuestion++;
      await setApplicationSession(message.author.id, appSession);
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
      
      await deleteApplicationSession(message.author.id);
    }
    return;
  }

  if (taxRoom === message.channel.id) {
    if (!/^\d+$/.test(content)) {
      await message.delete().catch(() => {});
      return;
    }

    const amount = parseInt(content);
    const proBotTax = calculateProBotTax(amount);
    const mediatorTax = calculateMediatorTax(amount);

    await saveTaxCalculation(message.author.id, message.id, amount, proBotTax, mediatorTax);

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

  if (message.author.id === PROBOT_ID && message.embeds.length > 0) {
    const embed = message.embeds[0];
    if (embed.image && embed.image.url) {
      const channelId = message.channel.id;
      const purchaseData = await getPendingPurchase(channelId);
      
      if (purchaseData && purchaseData.waitingForProBot) {
        purchaseData.proBotMessageId = message.id;
        await setPendingPurchase(channelId, purchaseData);
      }
    }
  }

  if (message.author.id === PROBOT_ID && message.content.includes(':moneybag:')) {
    const channelId = message.channel.id;
    const purchaseData = await getPendingPurchase(channelId);
    
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
        await deletePendingPurchase(channelId);
      }, 60000);
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    const customId = interaction.customId;
    
    if (customId.startsWith('robux_')) {
      const [, userId, messageId] = customId.split('_');
      
      const taxData = await getTaxCalculation(userId, messageId);
      if (!taxData) {
        await interaction.reply({
          content: '❌ انتهت صلاحية هذا الحساب',
          ephemeral: true,
        });
        return;
      }

      const robuxTax = calculateRobuxTax(taxData.amount);
      
      await interaction.reply({
        content: `ضـريـبـة الــروبــكــس : \`${robuxTax.toLocaleString()}\``,
        ephemeral: true,
      });
    }
    else if (customId.startsWith('open_ticket_')) {
      const ticketType = customId.replace('open_ticket_', '');
      
      const existingTicket = await getUserTicket(interaction.user.id);
      if (existingTicket) {
        await interaction.reply({
          content: `❌ لديك تكت مفتوح بالفعل: <#${existingTicket}>`,
          ephemeral: true,
        });
        return;
      }

      const categoryId = ticketType === 'member' ? MEMBER_TICKET_CATEGORY_ID : ADMIN_TICKET_CATEGORY_ID;
      const supportRoles = ticketType === 'member' ? MEMBER_SUPPORT_ROLES : ADMIN_SUPPORT_ROLES;

      const ticketNum = await incrementTicketCounter();
      const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${ticketNum}`,
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

      await setUserTicket(interaction.user.id, ticketChannel.id);

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🎫 تكت جديد')
        .setDescription(`مرحباً ${interaction.user}!\nسيتم الرد عليك قريباً`)
        .setTimestamp();

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`claim_${ticketChannel.id}_${interaction.user.id}`)
            .setLabel('استلام')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✋'),
          new ButtonBuilder()
            .setCustomId(`close_${ticketChannel.id}_${interaction.user.id}`)
            .setLabel('قفل')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒')
        );

      await ticketChannel.send({
        embeds: [embed],
        components: [row],
      });

      await interaction.reply({
        content: `✅ تم إنشاء تكتك: ${ticketChannel}`,
        ephemeral: true,
      });

      await sendLog(interaction.guild, 'فتح تكت', ticketChannel.name, interaction.user);
    }
    else if (customId.startsWith('claim_')) {
      const [, ticketChannelId, ticketOwnerId] = customId.split('_');
      
      const claimerId = await getTicketClaimer(ticketChannelId);
      if (claimerId) {
        await interaction.reply({
          content: '❌ هذا التكت مستلم بالفعل!',
          ephemeral: true,
        });
        return;
      }

      await setTicketClaimer(ticketChannelId, interaction.user.id);

      await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
        ViewChannel: true,
        SendMessages: true,
      });

      await interaction.update({
        components: [],
      });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`unclaim_${ticketChannelId}_${ticketOwnerId}`)
            .setLabel('إلغاء الاستلام')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❌'),
          new ButtonBuilder()
            .setCustomId(`close_${ticketChannelId}_${ticketOwnerId}`)
            .setLabel('قفل')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒')
        );

      await interaction.channel.send({
        content: `✅ تم استلام التكت بواسطة ${interaction.user}`,
        components: [row],
      });
    }
    else if (customId.startsWith('unclaim_')) {
      const [, ticketChannelId, ticketOwnerId] = customId.split('_');
      
      const claimerId = await getTicketClaimer(ticketChannelId);
      if (!claimerId || interaction.user.id !== claimerId) {
        await interaction.reply({
          content: '❌ فقط مستلم التكت يمكنه إلغاء الاستلام!',
          ephemeral: true,
        });
        return;
      }

      await deleteTicketClaimer(ticketChannelId);

      await interaction.update({
        components: [],
      });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`claim_${ticketChannelId}_${ticketOwnerId}`)
            .setLabel('استلام')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✋'),
          new ButtonBuilder()
            .setCustomId(`close_${ticketChannelId}_${ticketOwnerId}`)
            .setLabel('قفل')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒')
        );

      await interaction.channel.send({
        content: `✅ تم إلغاء الاستلام بواسطة ${interaction.user}`,
        components: [row],
      });
    }
    else if (customId.startsWith('request_claim_')) {
      const [, , ticketChannelId, ticketOwnerId] = customId.split('_');
      
      const claimerId = await getTicketClaimer(ticketChannelId);
      if (!claimerId) {
        await interaction.reply({
          content: '❌ هذا التكت غير مستلم!',
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

      const requestEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('📨 طلب استلام جديد')
        .setDescription(`${interaction.user} يريد استلام التكت`)
        .setTimestamp();

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
      
      const claimerId = await getTicketClaimer(ticketChannelId);
      if (interaction.user.id !== claimerId) {
        await interaction.reply({
          content: '❌ فقط المستلم الحالي يمكنه قبول الطلب!',
          ephemeral: true,
        });
        return;
      }

      await setTicketClaimer(ticketChannelId, requesterId);

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
      
      const claimerId = await getTicketClaimer(ticketChannelId);
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

      const claimerId = await getTicketClaimer(ticketChannelId);
      if (!claimerId || interaction.user.id !== claimerId) {
        await interaction.reply({
          content: '❌ فقط مستلم التكت يمكنه القفل!',
          ephemeral: true,
        });
        return;
      }

      const channelName = interaction.channel.name;
      
      await sendLog(interaction.guild, 'قفل تكت', channelName, interaction.user);

      await deleteUserTicket(ticketOwnerId);
      await deleteTicketClaimer(ticketChannelId);
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
      await setApplicationSession(interaction.user.id, {
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
      const userGoldAmount = await getUserGold(interaction.user.id);
      
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

      await setPendingPurchase(interaction.channel.id, {
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

      await setPendingPurchase(interaction.channel.id, {
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
            const stillExists = await getPendingPurchase(purchaseChannel.id);
            if (stillExists) {
              await purchaseChannel.delete().catch(() => {});
              await deletePendingPurchase(purchaseChannel.id);
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
    const allowedCommandsEverywhere = ['ادخال_اعضاء'];
    if (interaction.guildId !== MAIN_SERVER_ID && !allowedCommandsEverywhere.includes(interaction.commandName)) {
      if (!BOT_OWNERS.includes(interaction.user.id)) {
        await interaction.reply({
          content: '❌ هذا الأمر يعمل فقط في السيرفر الرئيسي!',
          ephemeral: true,
        });
        return;
      }
    }

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
      await setTaxRoom(interaction.guild.id, channel.id);

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
      await addAuthorizedVerifier(user.id);

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
      await removeAuthorizedVerifier(user.id);

      await interaction.reply({
        content: `✅ تم إزالة ${user} من المفحصين`,
        ephemeral: true,
      });
    } else if (interaction.commandName === 'ادخال_اعضاء') {
      if (!BOT_OWNERS.includes(interaction.user.id) && !(await isAuthorizedVerifier(interaction.user.id))) {
        await interaction.reply({
          content: '❌ ليس لديك صلاحية استخدام هذا الأمر!',
          ephemeral: true,
        });
        return;
      }

      const count = interaction.options.getInteger('العدد');
      
      const verifiedArray = await getVerifiedUserIds(count);
      const membersToAdd = verifiedArray;

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
      await setImageOnlyRoom(interaction.guild.id, channel.id);

      await interaction.reply({
        content: `✅ تم تحديد ${channel} كروم للصور فقط`,
        ephemeral: true,
      });
    } else if (interaction.commandName === 'تحديد_روم_خط') {
      const channel = interaction.options.getChannel('الروم');
      const image = interaction.options.getAttachment('الصورة');

      await setAutoLineRoom(interaction.guild.id, channel.id, image.url);

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

      await addGold(user.id, amount);

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

      const count = await resetAllGold();

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
      const oldGold = await getUserGold(user.id);
      await resetUserGold(user.id);

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

      if (await isBlacklisted(user.id)) {
        await interaction.reply({
          content: `❌ ${user} محظور بالفعل!`,
          ephemeral: true,
        });
        return;
      }

      await addToBlacklist(user.id);

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

      if (!(await isBlacklisted(user.id))) {
        await interaction.reply({
          content: `❌ ${user} غير محظور!`,
          ephemeral: true,
        });
        return;
      }

      await removeFromBlacklist(user.id);

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
        const totalGold = await getTotalGold();
        const totalBlacklisted = await getBlacklistCount();
        const totalVerified = await getVerifiedUsersCount();
        const totalVerifiers = await getVerifiersCount();
        const totalTickets = await getUserTicketsCount();

        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle('📊 إحصائيات البوت')
          .addFields(
            { name: 'عدد السيرفرات', value: `${totalGuilds}`, inline: true },
            { name: 'عدد المستخدمين', value: `${totalUsers}`, inline: true },
            { name: 'إجمالي الذهب', value: `${totalGold} 🪙`, inline: true },
            { name: 'المحظورون', value: `${totalBlacklisted}`, inline: true },
            { name: 'التكتات المفتوحة', value: `${totalTickets}`, inline: true },
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

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  if (message.channel.type === 1) {
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
