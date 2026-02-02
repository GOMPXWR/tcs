import { Client, GatewayIntentBits, Partials, SlashCommandBuilder, ChannelType, PermissionFlagsBits, EmbedBuilder, Collection } from 'discord.js'
import dotenv from 'dotenv'

dotenv.config()

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
})

const modmailMap = new Map()
client.commands = new Collection()

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Ping del bot'),

  new SlashCommandBuilder()
    .setName('close-modmail')
    .setDescription('Cierra un ModMail')
]

for (const command of commands) {
  client.commands.set(command.name, command)
}

const isStaff = async interaction => {
  if (!interaction.member) return false
  return interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)
}

client.once('ready', async () => {
  console.log(`🟢 Conectado como ${client.user.tag}`)
  await client.application.commands.set(commands)
})

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return

  const commandName = interaction.commandName

  if (commandName === 'ping') {
    return interaction.reply({ content: '🏓 Pong!', ephemeral: true })
  }

  if (commandName === 'close-modmail') {
    if (!await isStaff(interaction)) {
      return interaction.reply({ content: '❌ No tienes permiso.', ephemeral: true })
    }

    const channel = interaction.channel
    const entry = [...modmailMap.entries()].find(([, v]) => v.channelId === channel.id)

    if (!entry) {
      return interaction.reply({ content: '❌ Este canal no es un ModMail.', ephemeral: true })
    }

    const [userId] = entry
    const user = await client.users.fetch(userId).catch(() => null)

    if (user) {
      await user.send('📪 Tu ModMail ha sido cerrado por el staff.')
    }

    modmailMap.delete(userId)
    await interaction.reply({ content: '✅ ModMail cerrado.', ephemeral: true })
    setTimeout(() => channel.delete().catch(() => {}), 3000)
  }
})

client.on('messageCreate', async message => {
  if (message.author.bot) return

  if (!message.guild) {
    const user = message.author
    const guild = client.guilds.cache.first()

    let data = modmailMap.get(user.id)
    let channel

    if (data) {
      channel = await guild.channels.fetch(data.channelId).catch(() => null)
    }

    if (!channel) {
      channel = await guild.channels.create({
        name: `modmail-${user.username}`.toLowerCase(),
        type: ChannelType.GuildText,
        parent: process.env.MODMAIL_CATEGORY,
        permissionOverwrites: [
          {
            id: guild.roles.everyone,
            deny: [PermissionFlagsBits.ViewChannel]
          }
        ]
      })

      modmailMap.set(user.id, { channelId: channel.id })

      const embed = new EmbedBuilder()
        .setTitle('📩 Nuevo ModMail')
        .setDescription(`Usuario: ${user.tag}\nID: ${user.id}`)
        .setColor(0x00ffcc)
        .setTimestamp()

      await channel.send({ embeds: [embed] })
    }

    await channel.send(`👤 **${user.tag}:** ${message.content}`)
    return
  }

  if (message.channel.name?.startsWith('modmail-')) {
    const entry = [...modmailMap.entries()].find(([, v]) => v.channelId === message.channel.id)
    if (!entry) return

    const [userId] = entry
    const user = await client.users.fetch(userId).catch(() => null)

    if (user) {
      await user.send(`🛡️ **Staff:** ${message.content}`)
    }
  }
})

client.login(process.env.DISCORD_TOKEN)
