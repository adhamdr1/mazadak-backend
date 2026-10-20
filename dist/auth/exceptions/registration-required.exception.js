"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistrationRequiredException = void 0;
const common_1 = require("@nestjs/common");
class RegistrationRequiredException extends common_1.UnauthorizedException {
    constructor() {
        super('USER_NOT_FOUND_REQUIRE_REGISTRATION');
    }
}
exports.RegistrationRequiredException = RegistrationRequiredException;
//# sourceMappingURL=registration-required.exception.js.map