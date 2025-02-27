import axios from 'axios';
import { WAFRN_EMAIL, WAFRN_PASSWORD, WAFRN_URL } from './constants.js';

export const login = async () => {
  try {
    if (!WAFRN_EMAIL || !WAFRN_PASSWORD) {
      console.error('Missing credentials to login to wafrn');
      return;
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
      console.error('Wafrn login failed');
      console.error(errorMessage);
      return;
    }
    console.log('Logged in to wafrn');
    return token;
  } catch (error) {
    console.log(error);
  }
}
