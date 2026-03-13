/**
 * @file index.js
 * @description Ponto de entrada do bot.
 * 
 * Responsável pelo ciclo de arranque da aplicação: carregar variáveis de ambiente, iniciar o client, conectar-se ao MongoDB, verificar comandos automaticamente e reagir às interações em tempo real.
 */

require('dotenv').config();
const { Client, GatewayIntentBits, Collection, MessageFlags, PermissionFlagsBits, REST, Routes, ChannelType } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const GuildUser = require('./models/GuildUser');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Ligação ao MongoDB é iniciada antes do login para que comandos no qual dependem de persistência não recebam interações sem acesso ao banco de dados
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🍃 Conectado ao MongoDB!'))
    .catch(err => console.error('❌ Não foi possivel conectar ao MongoDB:', err));

// A função do Collection é ser um repositório em memória para despachar comandos sem precisar de múltiplos if/else ou switch gigantes no evento.
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    /**
     * Registra apenas módulos que seguem o contrato esperado pelo bot:
     * - data: definição do slash command
     * - execute: função assíncrona chamada quando o comando for utilizado
     * 
     * Esta validação impede que ficheiros auxiliares na pasta commands causem erro de execução no momento do bootstrap
     */
    
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`Comando ${command.data.name} carregado!`);
    }
}

client.on('interactionCreate', async interaction => {
    
    // Primeiro fluxo: comandos slash tradicionais
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: 'Ocorreu um erro ao executar esse comando!',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    // Segundo fluxo: botão do sistema de tickets
    if (interaction.isButton() && interaction.customId === 'open_ticket') {
        try {
            const userData = await GuildUser.findOne({ guildId: interaction.guild.id, userId: interaction.user.id });

            if (userData?.activateTicket) {
                const existingChannel = interaction.guild.channels.cache.get(userData.activateTicket);
                if (existingChannel) {
                    return interaction.reply({ 
                        content: `Você já possui um ticket aberto em ${existingChannel}!`, 
                        flags: MessageFlags.Ephemeral 
                    });

                    /**
                     * Antes de criar um novo canal, o bot verifica se já existe ticket ativo associado ao utilizador. Isso evita duplicidade de canais, desorganização no suporte e abuso do sistema por spam de cliques.
                     */
                }
            }

            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels] }
                ]
            });

            // O upsert garante que o registro do utilizador exista mesmo que seja o primeuiro contato dele com qualquer sistema do bot.
            await GuildUser.findOneAndUpdate(
                { guildId: interaction.guild.id, userId: interaction.user.id },
                { activateTicket: channel.id },
                { upsert: true }
            );

            await channel.send({ content: `${interaction.user}, a nossa equipe de suporte irá atendê-lo brevemente!` });
            await interaction.reply({ content: `Ticket criado com sucesso: ${channel}`, flags: MessageFlags.Ephemeral });

        } catch (error) {
            console.error("Erro ao abrir ticket:", error);
            if (!interaction.replied) {
                await interaction.reply({ content: "Erro ao criar ticket. Verifique minhas permissões!", flags: MessageFlags.Ephemeral });
            }
        }
    }
});

client.once('clientReady', async () => {
    console.log(`${client.user.tag} está online!`);
    
    const commandsData = client.commands.map(cmd => cmd.data.toJSON());
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        /**
         * A sincronização envia ao Discord a definição atual dos slash commands. Sem a existência dessa etapa, alterações locais como novos subcomandos ou descrições não apareceriam na interface do usuário.
         */
        console.log(`⌛ Sincronizando ${commandsData.length} comandos...`);
        await rest.put(
            Routes.applicationCommands(client.user.id, '1304927459363393566'),
            { body: commandsData }
        );
        console.log('✅ Comandos sincronizados com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao sincronizar:', error);
    }
});

client.login(process.env.DISCORD_TOKEN);