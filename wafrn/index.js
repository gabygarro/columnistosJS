import axios from 'axios';
import { login } from './login.js';

const wafrn = async () => {
  try {
    const token = await login();
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
