"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SENSITIVE_WORDS = exports.STOP_WORDS = void 0;
exports.filterWordCloud = filterWordCloud;
exports.STOP_WORDS = new Set([
    'the', 'and', 'a', 'to', 'of', 'in', 'i', 'is', 'that', 'it', 'on', 'you', 'this',
    'for', 'but', 'with', 'are', 'have', 'be', 'at', 'or', 'as', 'was', 'so', 'if',
    'out', 'not', 'my', 'we', 'me'
]);
exports.SENSITIVE_WORDS = new Set([
    // Simple PG-filter list
    'fuck', 'shit', 'bitch', 'ass', 'damn', 'crap', 'cunt', 'dick', 'pussy', 'whore', 'slut'
]);
function filterWordCloud(words) {
    return words
        .filter(({ word }) => {
        const lower = word?.toLowerCase();
        if (!lower)
            return false;
        if (exports.STOP_WORDS.has(lower))
            return false;
        if (exports.SENSITIVE_WORDS.has(lower))
            return false;
        return true;
    })
        .map(({ word, size }) => ({ text: word, size: Number(size) }))
        .sort((a, b) => b.size - a.size);
}
