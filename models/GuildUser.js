/**
 * @file GuildUser.js
 * @description Modelo principal do usuário dentro de cada servidor
 * 
 * Este ficheiro concentra o estado persistente usado pelos comandos de moderação e pelo sistema de tickets. A estratégia é guardar um documento por combinação de guilda + usuário para que o bot consiga responder rapidamente a consultas.
 * Exemplos: "Qauntos avisos esse membro tem" ou "Este usuário já possui ticket aberto?"
 */

const mongoose = require('mongoose');


/**
 * Subdocumento de advertência.
 * 
 * Em vez de guardar apenas uma contagem numérica, o sistema armazena um histórico completo. Isso permite auditoria posterior, exibição detalhada no comando "/warn list" e remoção precisa de um aivso específico pelo respetivo índice
 */
const UserSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },

    // Histórico completo de moderação aplicadas a membros
    warnings: [{
        moderatorId: String,
        reason: String,
        date: { type: Date, default: Date.now }
    }],

    // ID do canal se o membro tiver um ticket aberto.
    activeTickets: { type: String, default: null },

    // Petmite bloquear usuários de certas funções sem precisar banir-los
    isBlacklisted: { type: Boolean, default: false }
});

// Este método evita que documentos sejam duplicados para o mesmo membro na mesma guilda.
UserSchema.index({ guildId: 1, userId: 1 }, { unique: true });

/**
 * Adiciona uma advertência ao histórico do membro.
 *
 * Metodo no qual encapsula a lógica de inserção para evitar duplicações em vários comandos. Centralizar essa regra também facilita futuras validações, como limite máximo de avisos ou normalização de texto antes de salvar
 */
UserSchema.methods.addWarning = function addWarning(moderatorId, reason) {
    this.warnings.push({
        moderatorId,
        reason,
        date: new Date()
    });

    return this.save();
};

/**
 * Remove uma advertência pelo índice lógico mostrado ao moderador.
 *
 * O comando /warn list exibe os avisos começando em 1, mas internamente o array começa em 0. Esse helper recebe o index interno, valida o intervalo e devolve também o aviso removido para confirmação.
 */
UserSchema.methods.removeWarningByIndex = async function removeWarningByIndex(index) {
    if (index < 0 || index >= this.warnings.length) {
        throw new RangeError('Índice de advertência inválido.');
    }

    const removedWarning = this.warnings.splice(index, 1)[0];
    await this.save();

    return removedWarning;
};

/**
 * Fecha o ticket do usuário.
 *
 * O comando de fechar ticket precisa limpar o vínculo entre utilizador e canal. Manter esta operação como método reduz o risco de usar nomes de campo diferentes em cada comando e melhora a legibilidade do fluxo de suporte.
 */
UserSchema.methods.clearActiveTicket = function clearActiveTicket() {
    this.activateTicket = null;
    return this.save();
};

module.exports = mongoose.model('GuildUser', UserSchema);