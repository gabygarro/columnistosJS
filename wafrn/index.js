import axios from 'axios';
import { WAFRN_EMAIL, WAFRN_PASSWORD, WAFRN_URL } from './constants.js';

const wafrn = async () => {
  try {
    const token = await login();
    const response = await axios.post(
      `${WAFRN_URL}/api/v3/createPost`,
      {
        content: "este woot fue enviado desde aws lambda pero ahora es deployed desde GitHub Actions",
        content_warning: "",
        medias: [],
        privacy: 0,
        tags: ""
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    console.log(response);
    const ipResponse = await axios.get('https://api.ipify.org?format=json');
    console.log(ipResponse.data);
    return;
  } catch (error) {
    console.log(error);
    return;
  }
};

const login = async () => {
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

export default wafrn;
