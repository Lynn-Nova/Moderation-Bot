/**
 * @file warnSchema.js
 * @description Schema alternativo para armazenar advertências por servidor e usuário.
 *
 * Este modelo é útil quando o projeto precisa guardar a coleção completa de avisos em um documento separado. Mesmo que exista outra estrutura no projeto, manter este arquivo bem documentado demonstra conhecimento de modelagem com Mongoose.
 */

const mongoose = require('mongoose');

// Subschema de cada aviso individual. _id permanece ativo porque isso facilita remover ou localizar um aviso específico no futuro.
const warningEntrySchema = new mongoose.Schema({
    // Guarda o texto da advertência aplicada pelo moderador.
    reason: {
        type: String,
        required: true,
        trim: true,
    },

    // Armazena o ID do moderador responsável pela punição.
    moderatorId: {
        type: String,
        required: true,
    },

    // Registra quando a advertência foi criada.
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const warnSchema = new mongoose.Schema(
    {
        // ID do servidor onde a advertência foi emitida. Esse campo evita mistura de dados entre guildas diferentes.
        GuildID: {
            type: String,
            required: true,
            index: true,
        },

        // ID do usuário punido dentro do servidor.
        UserID: {
            type: String,
            required: true,
            index: true,
        },

        // Lista de advertências relacionadas ao usuário. Um array de objetos é melhor do que um array genérico porque impõe estrutura.
        Content: {
            type: [warningEntrySchema],
            required: true,
            default: [],
        },
    },
    {
        // Gera createdAt e updatedAt automaticamente. Isso melhora auditoria, depuração e manutenção do histórico.
        timestamps: true,
    }
);

// Impede documentos duplicados para o mesmo usuário no mesmo servidor. Sem esse index composto, o banco de dados poderia criar dois históricos separados por acidente.
warnSchema.index({ GuildID: 1, UserID: 1 }, { unique: true });

// Garante que o array Content sempre exista antes de salvar. Essa proteção evita erros ao usar push em documentos recém-criados.
warnSchema.pre('save', function (next) {
    if (!Array.isArray(this.Content)) {
        this.Content = [];
    }

    next();
});

// Método de instância para adicionar uma advertência de forma padronizada. Centralizar essa lógica reduz repetição e evita objetos salvos em formatos diferentes.
warnSchema.methods.addWarning = function (moderatorId, reason) {
    this.Content.push({ moderatorId, reason });
    return this.save();
};

// Método de instância para remover uma advertência por posição. Retorna null quando o index é inválido para que o comando possa tratar a resposta corretamente.
warnSchema.methods.removeWarningByIndex = function (index) {
    if (index < 0 || index >= this.Content.length) {
        return null;
    }

    const removed = this.Content.splice(index, 1)[0];
    return this.save().then(() => removed);
};

module.exports = mongoose.model('warnSchema', warnSchema);
