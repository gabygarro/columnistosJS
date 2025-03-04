import axios from 'axios';
import { login } from './login.js';
import { WAFRN_URL } from './constants.js'

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
  } catch (error) {
    console.log(error);
  }
};

export default wafrn;
