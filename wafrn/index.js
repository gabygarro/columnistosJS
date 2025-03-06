import axios from 'axios';
import { WAFRN_EMAIL, WAFRN_PASSWORD, WAFRN_URL } from './constants.js';

export const login = async () => {
  if (!WAFRN_EMAIL || !WAFRN_PASSWORD) {
    throw new Error('Missing credentials to login to wafrn');
  }
  console.log('Logging in to wafrn');
  const { data: { success, token, errorMessage }} = await axios.post(
    `${WAFRN_URL}/api/login`,
    {
      email: WAFRN_EMAIL,
      password: WAFRN_PASSWORD,
    }
  );
  if (success !== true) {
    console.error(errorMessage);
    throw new Error('Wafrn login failed');
  }
  console.log('Logged in to wafrn');
  return token;
};

export const sendPrivateWoot = async (message, { token }) =>
  sendWoot(message, { token, privacy: 10 });

export const sendWoot = async (message, { token, privacy = 0 }) => {
  const response = await axios.post(
    `${WAFRN_URL}/api/v3/createPost`,
    {
      content: message,
      content_warning: "",
      medias: [],
      privacy,
      tags: ""
    },
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
  return response;
};

export const getDms = async ({ token }) => {
  const response = await axios.get(
    `${WAFRN_URL}/api/v2/dashboard`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        page: 0,
        level: 10,
        startScroll: new Date().valueOf(),
      }
    }
  );
  return response;
};
