"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trim = trim;
exports.trimLowerCase = trimLowerCase;
function trim({ value }) {
    if (typeof value !== 'string') {
        return value;
    }
    return value.trim();
}
function trimLowerCase({ value }) {
    if (typeof value !== 'string') {
        return value;
    }
    return value.trim().toLowerCase();
}
//# sourceMappingURL=string.transformer.js.map