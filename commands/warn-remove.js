<<<<<<< HEAD
/**
 * @file warn-remove.js
 * @description Remove uma advertência específica do histórico de um usuário.
 *
 * O comando usa o index numérico informado pelo moderador e converte esse valor para posição real do array salvo no MongoDB.
 */

=======
>>>>>>> 91068e0 (Correção de comentários)
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const GuildUser = require('../models/GuildUser');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn-remove')
        .setDescription('Remove uma advertência específica de um membro.')
        .addUserOption(opt => opt.setName('alvo').setDescription('Membro que terá o aviso removido.').setRequired(true))
        .addIntegerOption(opt => opt.setName('id').setDescription('O ID do aviso (vê no /warn list).').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getUser('alvo');
<<<<<<< HEAD

        // O moderador vê IDs começando em 1. omo arrays em JavaScript começam em 0, é necessário ajustar o índice.
        const warnId = interaction.options.getInteger('id') - 1;
        const guildId = interaction.guild.id;

        // Busca o documento do usuário apenas no servidor atual. Isso impede remover advertências de outro servidor por engano.
        const userData = await GuildUser.findOne({ guildId: guildId, userId: target.id });

        // Se não existir histórico, não há nada para remover.
        if (!userData || !userData.warnings || userData.warnings.length === 0) {
            return interaction.reply({
                content: `O membro ${target.tag} não possui advertências no sistema.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        // Valida o ID informado pelo moderador. Essa checagem evita acesso fora do array e respostas incorretas.
        if (warnId < 0 || warnId >= userData.warnings.length) {
            return interaction.reply({
                content: `ID inválido! Esse membro só tem ${userData.warnings.length} aviso(s).`,
                flags: MessageFlags.Ephemeral,
            });
        }

        // Remove exatamente um elemento na posição indicada. O splice retorna um array com o item removido, por isso foi utilizado [0] na resposta.
        const removedWarn = userData.warnings.splice(warnId, 1);

        // Persistir a alteração é obrigatório. Sem save(), a remoção aconteceria só em memória e seria perdida.
        await userData.save();

        return interaction.reply({
            content: `✅ A advertência **#${warnId + 1}** (${removedWarn[0].reason}) foi removida de **${target.tag}**.`,
        });
    },
};
=======
        const warnId = interaction.options.getInteger('id') - 1;
        const guildId = interaction.guild.id;

        // Procurar os dados do usuário
        const userData = await GuildUser.findOne({ guildId: guildId, userId: target.id });

        // Verificações de segurança
        if (!userData || !userData.warnings || userData.warnings.length === 0) {
            return interaction.reply({ 
                content: `O membro ${target.tag} não possui advertências no sistema.`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        if (warnId < 0 || warnId >= userData.warnings.length) {
            return interaction.reply({ 
                content: `ID inválido! Esse membro só tem ${userData.warnings.length} aviso(s).`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        // Remover o aviso do Array
        const removedWarn = userData.warnings.splice(warnId, 1);
        
        // Salvar na Database
        await userData.save();

        return interaction.reply({ 
            content: `✅ A advertência **#${warnId + 1}** (${removedWarn[0].reason}) foi removida de **${target.tag}**.` 
        });
    }
};
>>>>>>> 91068e0 (Correção de comentários)
