/**
 * @file ticket.js
 * @description Configura o painel inicial do sistema de tickets.
 *
 * O objetivo deste comando é publicar uma mensagem fixa com botão de abrir. A interação do botão pode ser tratada em outro ponto do projeto, mantendo aqui apenas a responsabilidade de criação da interface inicial.
 */

const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-setup')
        .setDescription('Configurar o painel de tickets')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // O embed serve como painel visual do sistema. Isso melhora a experiência do usuário e deixa o botão de abrir ticket mais intuitivo.
        const embed = new EmbedBuilder()
            .setTitle('🎫 Sistema de tickets')
            .setDescription('Clique no botão abaixo para criar um ticket.')
            .setColor('#2b2d31')
            .setFooter({ text: 'Sistema de Suporte' });

        // Todo botão precisa estar dentro de uma ActionRow. Esse é um requisito estrutural da API do Discord para componentes interativos.
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                // O customId identifica a ação quando o botão for clicado. Esse valor precisa ser estável para o listener reconhecer a interação correta.
                .setCustomId('open_ticket')
                .setLabel('Abrir ticket')
                .setEmoji('📩')
                .setStyle(ButtonStyle.Primary)
        );

        // A resposta publica o painel no canal atual. Como o objetivo é servir todos os membros, ela não deve ser efêmera.
        return interaction.reply({ embeds: [embed], components: [row] });
    },
};
