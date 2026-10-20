"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RELEASE_LOCK_LUA_SCRIPT = void 0;
exports.RELEASE_LOCK_LUA_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;
//# sourceMappingURL=redis.constants.js.map