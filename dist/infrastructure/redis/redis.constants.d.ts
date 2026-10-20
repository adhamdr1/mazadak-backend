export declare const RELEASE_LOCK_LUA_SCRIPT = "\n  if redis.call(\"get\", KEYS[1]) == ARGV[1] then\n    return redis.call(\"del\", KEYS[1])\n  else\n    return 0\n  end\n";
