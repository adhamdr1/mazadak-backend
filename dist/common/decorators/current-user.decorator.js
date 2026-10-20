"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUser = void 0;
const common_1 = require("@nestjs/common");
const graphql_1 = require("@nestjs/graphql");
exports.CurrentUser = (0, common_1.createParamDecorator)((_data, context) => {
    if (context.getType() === 'graphql') {
        const ctx = graphql_1.GqlExecutionContext.create(context);
        const gqlCtx = ctx.getContext();
        return gqlCtx.user || gqlCtx.extra?.user || gqlCtx.req?.user;
    }
    else {
        const req = context.switchToHttp().getRequest();
        return req.user;
    }
    return undefined;
});
//# sourceMappingURL=current-user.decorator.js.map