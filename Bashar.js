const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');

const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

bot.on('messageCreate', message => {
    if (message.author.bot) return;

    if (message.content.toLowerCase() === 'بشار') {
        const audio = new AttachmentBuilder('bashar.wav');
        message.channel.send({ files: [audio] });
    }
});
