import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActivityType } from 'discord.js';
import axios from 'axios';
import translate from 'translate-google';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const BOT_VERSION = '8.0.4';

async function traducir(texto) {
  if (!texto) return texto;
  try { return await translate(texto, { to: 'es' }); } 
  catch (err) { return texto; }
}

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent] 
});

const commands = [
  new SlashCommandBuilder().setName('info').setDescription('Anime/Manga info').addStringOption(o => o.setName('tipo').setRequired(true).addChoices({name:'Anime',value:'anime'},{name:'Manga',value:'manga'})).addStringOption(o => o.setName('nombre').setRequired(true)),
  new SlashCommandBuilder().setName('waifu').setDescription('Random waifu'),
  new SlashCommandBuilder().setName('random-anime').setDescription('Anime recommendation'),
  new SlashCommandBuilder().setName('personaje').setDescription('Character info').addStringOption(o => o.setName('nombre').setRequired(true)),
  new SlashCommandBuilder().setName('noticias').setDescription('Anime news').addStringOption(o => o.setName('tipo').setRequired(true).addChoices({name:'Anime',value:'anime'},{name:'Manga',value:'manga'})),
  new SlashCommandBuilder().setName('quote').setDescription('Anime quote'),
  new SlashCommandBuilder().setName('daily').setDescription('Daily coins'),
  new SlashCommandBuilder().setName('balance').setDescription('Check balance'),
  new SlashCommandBuilder().setName('trabajar').setDescription('Work for coins'),
  new SlashCommandBuilder().setName('crime').setDescription('Commit crime'),
  new SlashCommandBuilder().setName('rob').setDescription('Rob user').addUserOption(o => o.setName('usuario').setRequired(true)),
  new SlashCommandBuilder().setName('shop').setDescription('Open shop'),
  new SlashCommandBuilder().setName('buy').setDescription('Buy item').addStringOption(o => o.setName('item').setRequired(true)),
  new SlashCommandBuilder().setName('inventory').setDescription('Check inventory'),
  new SlashCommandBuilder().setName('8ball').setDescription('Magic 8ball').addStringOption(o => o.setName('pregunta').setRequired(true)),
  new SlashCommandBuilder().setName('slots').setDescription('Play slots').addIntegerOption(o => o.setName('apuesta').setRequired(true)),
  new SlashCommandBuilder().setName('coinflip').setDescription('Coin flip').addStringOption(o => o.setName('lado').setRequired(true).addChoices({name:'Cara',value:'cara'},{name:'Cruz',value:'cruz'})).addIntegerOption(o => o.setName('apuesta').setRequired(true)),
  new SlashCommandBuilder().setName('meme').setDescription('Random meme'),
  new SlashCommandBuilder().setName('cat').setDescription('Cat image'),
  new SlashCommandBuilder().setName('dog').setDescription('Dog image'),
  new SlashCommandBuilder().setName('joke').setDescription('Random joke'),
  new SlashCommandBuilder().setName('staff').setDescription('Set staff role').addRoleOption(o => o.setName('rol').setRequired(true)),
  new SlashCommandBuilder().setName('ban').setDescription('Ban user').addUserOption(o => o.setName('usuario').setRequired(true)).addStringOption(o => o.setName('motivo').setRequired(false)),
  new SlashCommandBuilder().setName('kick').setDescription('Kick user').addUserOption(o => o.setName('usuario').setRequired(true)).addStringOption(o => o.setName('motivo').setRequired(false)),
  new SlashCommandBuilder().setName('mute').setDescription('Mute user').addUserOption(o => o.setName('usuario').setRequired(true)).addIntegerOption(o => o.setName('minutos').setRequired(true)),
  new SlashCommandBuilder().setName('unmute').setDescription('Unmute user').addUserOption(o => o.setName('usuario').setRequired(true)),
  new SlashCommandBuilder().setName('clear').setDescription('Clear messages').addIntegerOption(o => o.setName('cantidad').setRequired(true)),
  new SlashCommandBuilder().setName('warn').setDescription('Warn user').addUserOption(o => o.setName('usuario').setRequired(true)).addStringOption(o => o.setName('motivo').setRequired(true)),
  new SlashCommandBuilder().setName('nuke').setDescription('Reset channel'),
  new SlashCommandBuilder().setName('lock').setDescription('Lock channel'),
  new SlashCommandBuilder().setName('unlock').setDescription('Unlock channel'),
  new SlashCommandBuilder().setName('slowmode').setDescription('Set slowmode').addIntegerOption(o => o.setName('segundos').setRequired(true)),
  new SlashCommandBuilder().setName('announce').setDescription('Send announcement').addStringOption(o => o.setName('titulo').setRequired(true)).addStringOption(o => o.setName('texto').setRequired(true)),
  new SlashCommandBuilder().setName('ping').setDescription('Bot latency'),
  new SlashCommandBuilder().setName('avatar').setDescription('User avatar').addUserOption(o => o.setName('usuario').setRequired(false)),
  new SlashCommandBuilder().setName('user-info').setDescription('User info').addUserOption(o => o.setName('usuario').setRequired(false)),
  new SlashCommandBuilder().setName('server-info').setDescription('Server info'),
  new SlashCommandBuilder().setName('info-bot').setDescription('User manual'),
  new SlashCommandBuilder().setName('info-staff').setDescription('Staff manual')
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function isStaff(interaction) {
  if (!interaction.guild) return false;
  if (interaction.user.id === interaction.guild.ownerId) return true;
  try {
    const res = await pool.query('SELECT staff_role_id FROM server_config WHERE guild_id = $1', [interaction.guild.id]);
    const roleId = res.rows[0]?.staff_role_id;
    return roleId ? interaction.member.roles.cache.has(roleId) : false;
  } catch (err) { return false; }
}

client.once('ready', async () => {
  client.user.setActivity('TCS MOD', { type: ActivityType.Watching });
  try { await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands }); } 
  catch (err) { console.error(err); }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName, user, guild, options, channel } = interaction;
  try {
    if (commandName === 'ping') return await interaction.reply(`🏓 Latencia: ${client.ws.ping}ms`);
    if (commandName === 'ban') {
      if (!guild || !await isStaff(interaction)) return await interaction.reply('❌ Sin permisos o no en servidor.');
      const target = options.getUser('usuario');
      const reason = options.getString('motivo') || 'Sin motivo';
      await guild.members.ban(target, { reason });
      return await interaction.reply(`🔨 **${target.tag}** baneado. Motivo: ${reason}`);
    }
    if (commandName === 'mute') {
      if (!guild || !await isStaff(interaction)) return await interaction.reply('❌ Sin permisos.');
      const target = options.getUser('usuario');
      const mins = options.getInteger('minutos');
      if (target.bot || target.id === guild.ownerId) return await interaction.reply('❌ Objetivo inválido.');
      const member = await guild.members.fetch(target.id);
      if (!member.moderatable) return await interaction.reply('❌ No puedo moderar a este usuario.');
      await member.timeout(mins * 60 * 1000);
      return await interaction.reply(`🔇 **${target.tag}** silenciado por ${mins} min.`);
    }
    if (commandName === 'nuke') {
      if (!guild || !await isStaff(interaction)) return await interaction.reply('❌ Sin permisos.');
      const pos = channel.position;
      const newCh = await channel.clone();
      await channel.delete();
      await newCh.setPosition(pos);
      return await newCh.send('💥 Canal reseteado!');
    }
    if (commandName === 'daily') {
      const gId = guild?.id || 'GLOBAL';
      await pool.query('INSERT INTO users (guild_id, user_id, balance, last_daily) VALUES ($1, $2, 500, NOW()) ON CONFLICT (guild_id, user_id) DO UPDATE SET balance = users.balance + 500, last_daily = NOW()', [gId, user.id]);
      return await interaction.reply('💰 +500 monedas.');
    }
    if (commandName === 'coinflip') {
      const lado = options.getString('lado');
      const apuesta = options.getInteger('apuesta');
      const res = await pool.query('SELECT balance FROM users WHERE guild_id=$1 AND user_id=$2', [guild?.id || 'GLOBAL', user.id]);
      if ((res.rows[0]?.balance || 0) < apuesta) return await interaction.reply('❌ Saldo insuficiente.');
      const result = Math.random() < 0.5 ? 'cara' : 'cruz';
      if (lado === result) {
        await pool.query('UPDATE users SET balance = balance + $1 WHERE guild_id=$2 AND user_id=$3', [apuesta, guild?.id || 'GLOBAL', user.id]);
        return await interaction.reply(`🪙 Cayó **${result}**. ¡Ganaste!`);
      } else {
        await pool.query('UPDATE users SET balance = balance - $1 WHERE guild_id=$2 AND user_id=$3', [apuesta, guild?.id || 'GLOBAL', user.id]);
        return await interaction.reply(`🪙 Cayó **${result}**. Perdiste.`);
      }
    }
    if (commandName === 'meme') {
      const subs = ['SpanishMemes', 'memesenespanol', 'memexico', 'AradirOff'];
      const sub = subs[Math.floor(Math.random() * subs.length)];
      const { data } = await axios.get(`https://meme-api.com/gimme/${sub}`);
      const embed = new EmbedBuilder().setTitle(data.title).setImage(data.url).setColor(0x00ff00);
      return await interaction.reply({ embeds: [embed] });
    }
    if (!interaction.replied) await interaction.reply('✅ Comando procesado.');
  } catch (err) { 
    if (!interaction.replied) await interaction.reply('⚠️ Error al procesar.'); 
  }
});

client.login(process.env.DISCORD_TOKEN);
