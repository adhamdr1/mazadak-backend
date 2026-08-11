/**
 * Lua script to atomically release a Redis lock.
 * It checks if the key's value matches the expected unique token (lock value).
 * If it matches, it deletes the key (releasing the lock) and returns 1.
 * Otherwise, it returns 0 (doing nothing) to prevent deleting another instance's lock.
 */
export const RELEASE_LOCK_LUA_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;
