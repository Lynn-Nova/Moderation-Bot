/**
 * @file close.js
 * @description Fecha um ticket e remove o vínculo salvo no banco de dados.
 *
 * Este comando mostra validação de contexto, verificação de permissões e limpeza consistente do estado salvo antes da exclusão definitiva do canal.
 */

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const GuildUser = require('../models/GuildUser');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close')
        .setDescription('Fecha o ticket atual e remove-o do banco de dados'),

    async execute(interaction) {
        // O comando atua sempre sobre o canal atual. Isso evita que um usuário tente fechar tickets de outros canais por parâmetro.
        const channel = interaction.channel;
        const guildId = interaction.guild.id;

<<<<<<< HEAD
        // Procura o dono do ticket usando o canal como referência. O campo activateTicket liga o usuário ao canal privado aberto para suporte.
=======
>>>>>>> 91068e0 (Correção de comentários)
        const userData = await GuildUser.findOne({ guildId: guildId, activateTicket: channel.id });

        // Se não existir registro no banco de dados, o comando ainda pode funcionar em tickets manuais. Nesse caso, usamos o nome do canal como fallback e restringimos a ação a moderadores.
        if (!userData) {
            if (!channel.name.startsWith('ticket-')) {
<<<<<<< HEAD
                return interaction.reply({
                    content: 'Esse canal não é um ticket registrado no sistema.',
                    flags: MessageFlags.Ephemeral,
                });
            }

            // Sem registro persistido, apenas quem gerencia canais pode continuar. Essa barreira impede que qualquer usuário delete canais parecidos com tickets.
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({
                    content: 'Apenas moderadores podem fechar tickets não registrados.',
                    flags: MessageFlags.Ephemeral,
                });
            }
        }

        // Determina se o executor é o dono do ticket registrado.
        const isOwner = userData?.userId === interaction.user.id;

        // Moderadores com ManageChannels também podem encerrar tickets.
=======
                return interaction.reply({ 
                    content: 'Esse canal não é um ticket registrado no sistema.', 
                    flags: MessageFlags.Ephemeral 
                });
            }
            // Se o canal não estiver na Database o moderador poderá deletar
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({ content: 'Apenas moderadores podem fechar tickets não registrados.', flags: MessageFlags.Ephemeral });
            }
        }

        // Verificação de permissões
        const isOwner = userData?.userId === interaction.user.id;
>>>>>>> 91068e0 (Correção de comentários)
        const isMod = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);

        // Caso não seja dono nem moderador, a ação é bloqueada. Isso protege o ticket contra fechamento indevido por terceiros.
        if (!isOwner && !isMod) {
            return interaction.reply({
                content: 'Você não tem permissão para fechar esse ticket.',
                flags: MessageFlags.Ephemeral,
            });
        }

        try {
<<<<<<< HEAD
            // Antes de apagar o canal, O vínculo no banco de dados é removido. Isso evita que o usuário fique marcado como se ainda tivesse um ticket aberto.
            if (userData) {
                await GuildUser.findOneAndUpdate(
                    { guildId: guildId, userId: userData.userId },
                    { $unset: { activateTicket: '' } }
                );
            }

            // A resposta antecipada informa visualmente o encerramento e evita silêncio do bot.
            await interaction.reply('🔒 O ticket será fechado e deletado em 5 segundos...');

            // O atraso curto dá tempo para a mensagem ser lida antes da exclusão do canal.
            setTimeout(async () => {
                await channel.delete().catch(err => console.error('Erro ao apagar canal:', err));
=======
            if (userData) {
                await GuildUser.findOneAndUpdate(
                    { guildId: guildId, userId: userData.userId },
                    { $unset: { activateTicket: "" } }
                );
            }

            await interaction.reply('🔒 O ticket será fechado e deletado em 5 segundos...');

            setTimeout(async () => {
                await channel.delete().catch(err => console.error("Erro ao apagar canal:", err));
>>>>>>> 91068e0 (Correção de comentários)
            }, 5000);
        } catch (error) {
            console.error('Erro ao fechar ticket:', error);

            // A resposta efêmera evita poluir o canal com falhas técnicas caso o processo não conclua.
            await interaction.reply({
                content: 'Erro ao tentar fechar o ticket.',
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
