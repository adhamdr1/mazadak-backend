import { sendGraphQL } from './graphql.js';
import { DEFAULT_USERS } from '../config.js';

const LOGIN_MUTATION = `
  mutation Login($loginInput: LoginInput!) {
    login(loginInput: $loginInput) {
      accessToken
      refreshToken
      user {
        _id
        email
        firstName
        lastName
        role
      }
    }
  }
`;

/**
 * Log in a user and return the access token
 * @param {string} email
 * @param {string} password
 * @returns {string|null} accessToken
 */
export function login(email, password) {
  const result = sendGraphQL(
    LOGIN_MUTATION,
    {
      loginInput: {
        email,
        password,
      },
    },
    null,
    { tag_name: 'login_request' },
  );

  if (result.success && result.data && result.data.login) {
    return result.data.login.accessToken;
  }

  return null;
}

/**
 * Helper to get an auth token for a specific virtual user by index
 * @param {number} [index=0] - Index in the DEFAULT_USERS array
 * @returns {string|null}
 */
export function getVirtualUserToken(index = 0) {
  const user = DEFAULT_USERS[index % DEFAULT_USERS.length];
  return login(user.email, user.password);
}
