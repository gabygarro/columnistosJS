import axios from 'axios';

const WAFRN_URL = 'https://app.wafrn.net';

const wafrn = async () => {
  try {
    const email = process.env.WAFRN_EMAIL;
    const password = process.env.WAFRN_PASSWORD;
    if (!email || !password) {
      console.error('Missing credentials to login to wafrn');
      return;
    }
    console.log('Logging in to wafrn');
    const { data: { success, token, errorMessage }} = await axios.post(
      `${WAFRN_URL}/api/login`,
      {
        email,
        password,
      }
    );
    if (success !== true) {
      console.error('Wafrn login failed');
      console.error(errorMessage);
      console.log('password', password);
      return;
    }
    console.log('Logged in to wafrn');
    const response = await axios.post(
      `${WAFRN_URL}/api/v3/createPost`,
      {
        content: "este woot fue enviado desde aws lambda",
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
  } catch (error) {
    console.log(error);
  }
};

export default wafrn;
