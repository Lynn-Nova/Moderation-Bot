/**
 * @file mod.js
 * @project Sistema de Moderação
 * @description Reúne ações de kick, ban e timeout em um único comando com subcomandos.
 *
 * Este arquivo apresenta:
 * - uso de Slash Commands compostos;
 * - verificação de permissões e hierarquia;
 * - integração entre Discord API e MongoDB;
 * - tratamento de erro para ações administrativas.
 */

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const GuildUser = require('../models/GuildUser');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mod')
        .setDescription('Comandos de moderação.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)

        // Subcomando de kick. Remove o membro do servidor, mas permite que ele volte caso receba outro convite.
        .addSubcommand(sub =>
            sub.setName('kick')
                .setDescription('Expulsa um membro do servidor.')
                .addUserOption(opt => opt.setName('alvo').setDescription('Membro a ser expulso').setRequired(true))
                .addStringOption(opt => opt.setName('motivo').setDescription('Motivo da expulsão')))

        // Subcomando de ban. Banimento é mais severo porque impede retorno até revogação manual.
        .addSubcommand(sub =>
            sub.setName('ban')
                .setDescription('Bane um membro do servidor.')
                .addUserOption(opt => opt.setName('alvo').setDescription('Membro a ser banido').setRequired(true))
                .addStringOption(opt => opt.setName('motivo').setDescription('Motivo do banimento')))

        // Subcomando de timeout. Usa duração em minutos para facilitar entrada do moderador no uso diário.
        .addSubcommand(sub =>
            sub.setName('timeout')
                .setDescription('Silencia um membro temporariamente')
                .addUserOption(opt => opt.setName('alvo').setDescription('Membro a ser silenciado').setRequired(true))
                .addIntegerOption(opt => opt.setName('duracao').setDescription('Tempo em minutos').setRequired(true))
                .addStringOption(opt => opt.setName('motivo').setDescription('Motivo do silenciamento'))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const targetMember = interaction.options.getMember('alvo');
        const targetUser = interaction.options.getUser('alvo');
        const reason = interaction.options.getString('motivo') || 'Nenhum motivo fornecido.';
        const guildName = interaction.guild.name;

        // O getMember pode retornar null se o usuário não estiver no servidor. Essa checagem evita tentar kickar, banir ou silenciar um membro inexistente.
        if (!targetMember) {
            return interaction.reply({ content: 'Membro não encontrado.', flags: MessageFlags.Ephemeral });
        }

        // manageable verifica se o bot tem posição de cargo suficiente para agir. Sem isso, a API do Discord rejeitaria a punição e geraria erro.
        if (!targetMember.manageable) {
            return interaction.reply({
                content: `Eu não tenho permissões para punir ${targetUser.tag}.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        // Fluxo específico para timeout. Ele é separado porque não remove o usuário do servidor e usa duração temporária.
        if (sub === 'timeout') {
            const minutes = interaction.options.getInteger('duracao');
            const durationMs = minutes * 60 * 1000;

            try {
                // A API do Discord exige o tempo em milissegundos.
                await targetMember.timeout(durationMs, reason);

                // Registra o evento no banco de dados usando upsert. Assim o documento é criado automaticamente se o usuário ainda não existir na coleção.
                await GuildUser.findOneAndUpdate(
                    { guildId: interaction.guild.id, userId: targetUser.id },
                    { $push: { warnings: { moderatorId: interaction.user.id, reason: `[TIMEOUT ${minutes}m] ${reason}` } } },
                    { upsert: true }
                );

                // Tentar avisar por DM é útil, mas a ação principal não deve falhar se a DM estiver fechada.
                await targetUser
                    .send(`Você foi silenciado em **${guildName}** por ${minutes}m. Motivo: ${reason}`)
                    .catch(() => null);

                return interaction.reply({ content: `🔇 ${targetUser} foi silenciado por **${minutes} minutos**.` });
            } catch (error) {
                console.error(error);
                return interaction.reply({ content: 'Erro ao usar timeout.', flags: MessageFlags.Ephemeral });
            }
        }

        // Embed enviado por DM antes da punição final. Isso deixa o aviso mais legível e profissional do que texto puro.
        const dmEmbed = new EmbedBuilder()
            .setTitle(`Punição: ${sub === 'kick' ? 'Expulsão' : 'Banimento'}`)
            .setDescription(`${targetUser}, você recebeu uma punição.`)
            .addFields(
                { name: 'Servidor', value: guildName, inline: true },
                { name: 'Ação', value: sub.toUpperCase(), inline: true },
                { name: 'Motivo', value: reason }
            )
            .setColor(sub === 'kick' ? '#f39c12' : '#e74c3c')
            .setTimestamp();

        // Tenta enviar na DM, mas não bloqueia a ação se falhar.
        try {
            await targetUser.send({ embeds: [dmEmbed] });
        } catch (_e) {
            console.log(`DMs fechadas para ${targetUser.tag}`);
        }

        try {
            // Ação disciplinar principal.
            if (sub === 'kick') {
                await targetMember.kick(reason);
            } else if (sub === 'ban') {
                await targetMember.ban({ reason });
            }

            // Mesmo para kick e ban, o histórico fica salvo como warning. Isso cria uma trilha administrativa no MongoDB.
            await GuildUser.findOneAndUpdate(
                { guildId: interaction.guild.id, userId: targetUser.id },
                { $push: { warnings: { moderatorId: interaction.user.id, reason: `[${sub.toUpperCase()}] ${reason}` } } },
                { upsert: true }
            );

            return interaction.reply({ content: `✅ Ação **${sub}** executada com sucesso em ${targetUser}.` });
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: 'Erro ao executar a punição.', flags: MessageFlags.Ephemeral });
        }
    },
};
